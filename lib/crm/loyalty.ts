import "server-only";

import { prisma } from "@/lib/prisma";

export const LOYALTY_ENGINE_VERSION = "pisao_loyalty_v11";

export function loyaltyPolicy() {
  return {
    engineVersion: LOYALTY_ENGINE_VERSION,
    pointsPer1000Cop: 1,
    redemptionEnabled: false,
    accrualEvent: "ORDER_DELIVERED",
  } as const;
}

export function pointsForDeliveredOrder(totalCop: number) {
  if (!Number.isFinite(totalCop) || totalCop <= 0) return 0;
  return Math.max(1, Math.floor(totalCop / 1000));
}

export async function awardDeliveredOrderPoints(orderId: string) {
  const order = await prisma.pedido.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      estado: true,
      total: true,
      customerProfileId: true,
      pago: { select: { estado: true } },
    },
  });

  if (
    !order ||
    order.estado !== "ENTREGADO" ||
    order.pago?.estado !== "APROBADO" ||
    !order.customerProfileId
  ) {
    return { awarded: false, points: 0 };
  }

  const points = pointsForDeliveredOrder(Number(order.total));
  const eventKey = `order:${order.id}:delivered`;

  const existing = await prisma.customerLoyaltyEntry.findUnique({
    where: { eventKey },
    select: { id: true, points: true },
  });
  if (existing) {
    return { awarded: false, points: existing.points };
  }

  const entry = await prisma.customerLoyaltyEntry.create({
    data: {
      customerProfileId: order.customerProfileId,
      eventKey,
      event: "ORDER_DELIVERED",
      points,
      amountCop: order.total,
      referenceType: "Pedido",
      referenceId: order.id,
    },
    select: { id: true, points: true },
  });

  return { awarded: true, points: entry.points };
}

export async function getLoyaltyBalance(customerProfileId: string) {
  const aggregate = await prisma.customerLoyaltyEntry.aggregate({
    where: { customerProfileId },
    _sum: { points: true },
  });
  return aggregate._sum.points ?? 0;
}
