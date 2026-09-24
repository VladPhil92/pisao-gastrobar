import "server-only";

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  buildOrderTrackingSnapshot,
  normalizeCustomerPhone,
} from "@/lib/orders/tracking";

function phoneMatches(stored: string, supplied: string) {
  const left = Buffer.from(normalizeCustomerPhone(stored));
  const right = Buffer.from(normalizeCustomerPhone(supplied));
  return (
    left.length > 0 &&
    left.length === right.length &&
    timingSafeEqual(left, right)
  );
}

export async function lookupOrderStatusForCustomer(params: {
  numero: number;
  telefono: string;
}) {
  const pedido = await prisma.pedido.findUnique({
    where: { numero: params.numero },
    select: {
      numero: true,
      clienteTelefono: true,
      total: true,
      tipoEntrega: true,
      estado: true,
      createdAt: true,
      updatedAt: true,
      pago: {
        select: {
          metodo: true,
          estado: true,
          comprobanteRecibidoEn: true,
          verificadoEn: true,
          criptoMoneda: true,
          txHash: true,
          confirmacionesOnchain: true,
          payloadProveedor: true,
        },
      },
    },
  });

  if (!pedido || !phoneMatches(pedido.clienteTelefono, params.telefono)) {
    return null;
  }

  return buildOrderTrackingSnapshot({
    numero: pedido.numero,
    total: Number(pedido.total),
    tipoEntrega: pedido.tipoEntrega,
    estado: pedido.estado,
    createdAt: pedido.createdAt,
    updatedAt: pedido.updatedAt,
    pago: pedido.pago,
  });
}
