import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildCryptoOperationsSummary,
  type CryptoOperationsPaymentInput,
} from "@/lib/payments/crypto-treasury-core";

const DEFAULT_WINDOW_DAYS = 30;

export async function getCryptoOperationsSummary(
  windowDays = DEFAULT_WINDOW_DAYS,
) {
  const safeDays = Math.min(365, Math.max(1, Math.trunc(windowDays || 30)));
  const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

  const payments = await prisma.pago.findMany({
    where: {
      metodo: "CRIPTO",
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      estado: true,
      monto: true,
      descuentoAplicadoPct: true,
      criptoMoneda: true,
      txHash: true,
      confirmacionesOnchain: true,
      payloadProveedor: true,
      createdAt: true,
      verificadoEn: true,
      pedido: {
        select: {
          numero: true,
          descuento: true,
        },
      },
    },
  });

  const inputs: CryptoOperationsPaymentInput[] = payments.map((payment) => ({
    id: payment.id,
    estado: payment.estado,
    montoCop: Number(payment.monto),
    descuentoCop: Number(payment.pedido.descuento),
    descuentoPct:
      payment.descuentoAplicadoPct === null
        ? null
        : Number(payment.descuentoAplicadoPct),
    criptoMoneda: payment.criptoMoneda,
    txHash: payment.txHash,
    confirmacionesOnchain: payment.confirmacionesOnchain,
    payloadProveedor: payment.payloadProveedor,
    pedidoNumero: payment.pedido.numero,
    createdAt: payment.createdAt,
    verificadoEn: payment.verificadoEn,
  }));

  return {
    windowDays: safeDays,
    since: since.toISOString(),
    ...buildCryptoOperationsSummary(inputs),
  };
}
