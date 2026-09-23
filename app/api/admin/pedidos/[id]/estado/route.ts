import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  canTransitionOrderStatus,
  type OrderOperationalStatus,
} from "@/lib/orders/status";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";

const allowedStatuses = new Set<OrderOperationalStatus>([
  "PENDIENTE_PAGO",
  "PENDIENTE_VERIFICACION",
  "CONFIRMADO",
  "EN_PREPARACION",
  "LISTO",
  "EN_CAMINO",
  "ENTREGADO",
  "CANCELADO",
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["ADMIN", "CAJERO", "COCINA"].includes(rol ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { estado?: string };

  if (!body.estado || !allowedStatuses.has(body.estado as OrderOperationalStatus)) {
    return NextResponse.json(
      { error: "Estado de pedido inválido." },
      { status: 400 },
    );
  }

  const current = await prisma.pedido.findUnique({
    where: { id },
    select: {
      id: true,
      estado: true,
      tipoEntrega: true,
      pago: { select: { estado: true } },
    },
  });

  if (!current) {
    return NextResponse.json({ error: "Pedido no encontrado." }, { status: 404 });
  }

  if (
    !canTransitionOrderStatus({
      current: current.estado,
      next: body.estado as OrderOperationalStatus,
      deliveryType: current.tipoEntrega,
    })
  ) {
    return NextResponse.json(
      {
        error: "La transición solicitada no está permitida para este pedido.",
        code: "INVALID_ORDER_STATUS_TRANSITION",
        current: current.estado,
      },
      { status: 409 },
    );
  }

  if (current.pago?.estado !== "APROBADO") {
    return NextResponse.json(
      {
        error:
          "El pedido no puede avanzar operacionalmente hasta que el pago esté aprobado.",
        code: "PAYMENT_NOT_APPROVED",
      },
      { status: 409 },
    );
  }

  const updated = await prisma.pedido.update({
    where: { id },
    data: {
      estado: body.estado as OrderOperationalStatus,
      entregadoAt: body.estado === "ENTREGADO" ? new Date() : null,
    },
    select: {
      id: true,
      numero: true,
      estado: true,
      tipoEntrega: true,
      entregadoAt: true,
      updatedAt: true,
    },
  });

  void emitKevGovernanceEvent("pisao.order.status_changed", {
    order_ref: governanceRef(updated.id),
    source: "admin_order_operations",
    previous_status: current.estado,
    next_status: updated.estado,
    delivery_type: updated.tipoEntrega,
    staff_role: rol ?? "UNKNOWN",
  });

  return NextResponse.json({ pedido: updated });
}
