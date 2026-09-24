import "server-only";

import { prisma } from "@/lib/prisma";
import {
  notifyPaymentAdmin,
  type PaymentAdminNotificationResult,
} from "@/lib/notifications/payment-admin";
import type { PaymentEvidence } from "@/lib/uploads/evidencia";

const MAX_ATTEMPTS = 6;

function safeError(error: unknown) {
  const value = error instanceof Error ? error.message : "UnknownError";
  return value.replace(/[\r\n\t]+/g, " ").slice(0, 180);
}

function retryAt(attempts: number) {
  const minutes = [1, 3, 10, 30, 60, 180][Math.max(0, Math.min(attempts - 1, 5))];
  return new Date(Date.now() + minutes * 60_000);
}


export function paymentReviewSlaMinutes() {
  const parsed = Number(process.env.PAYMENT_REVIEW_SLA_MINUTES ?? "10");
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(120, Math.max(2, Math.round(parsed)));
}

export async function enqueueOverduePaymentReviewNotifications(limit = 50) {
  const slaMinutes = paymentReviewSlaMinutes();
  const cutoff = new Date(Date.now() - slaMinutes * 60_000);
  const payments = await prisma.pago.findMany({
    where: {
      estado: "EN_VERIFICACION",
      comprobanteRecibidoEn: { lte: cutoff },
      comprobanteSha256: { not: null },
      pedido: { is: { estado: "PENDIENTE_VERIFICACION" } },
    },
    orderBy: { comprobanteRecibidoEn: "asc" },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      pedidoId: true,
      comprobanteSha256: true,
    },
  });

  const data = payments.flatMap((payment) => {
    if (!payment.comprobanteSha256) return [];
    return [{
      eventKey: `PAYMENT_REVIEW_OVERDUE:${payment.pedidoId}:${payment.comprobanteSha256}`,
      event: "PAYMENT_REVIEW_OVERDUE",
      pedidoId: payment.pedidoId,
      proofSha256: payment.comprobanteSha256,
      status: "PENDING",
      nextAttemptAt: new Date(),
    }];
  });

  if (!data.length) return 0;
  const created = await prisma.paymentAdminNotification.createMany({
    data,
    skipDuplicates: true,
  });
  return created.count;
}

export async function enqueuePaymentEvidenceNotification(input: {
  pedidoId: string;
  proofSha256: string;
}) {
  const eventKey = `PAYMENT_EVIDENCE:${input.pedidoId}:${input.proofSha256}`;
  return prisma.paymentAdminNotification.upsert({
    where: { eventKey },
    create: {
      eventKey,
      event: "PAYMENT_EVIDENCE_RECEIVED",
      pedidoId: input.pedidoId,
      proofSha256: input.proofSha256,
      status: "PENDING",
      nextAttemptAt: new Date(),
    },
    update: {},
  });
}

async function loadNotificationPayload(notificationId: string) {
  const notification = await prisma.paymentAdminNotification.findUnique({
    where: { id: notificationId },
    include: {
      pedido: {
        include: {
          pago: true,
          items: { include: { producto: { select: { nombre: true } } } },
        },
      },
    },
  });

  if (!notification?.pedido.pago) return null;
  const pago = notification.pedido.pago;
  if (
    !pago.comprobanteBytes ||
    !pago.comprobanteMime ||
    !pago.comprobanteNombre ||
    !pago.comprobanteSha256
  ) return null;

  const bytes = new Uint8Array(pago.comprobanteBytes);
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  const evidence: PaymentEvidence = {
    bytes: new Uint8Array(arrayBuffer),
    arrayBuffer,
    fileName: pago.comprobanteNombre,
    mimeType: pago.comprobanteMime,
    sha256: pago.comprobanteSha256,
  };

  const order = notification.pedido;
  return {
    notification,
    evidence,
    order: {
      id: order.id,
      numero: order.numero,
      clienteNombre: order.clienteNombre,
      clienteTelefono: order.clienteTelefono,
      clienteEmail: order.clienteEmail,
      tipoEntrega: order.tipoEntrega,
      direccionEntrega: order.direccionEntrega,
      notas: order.notas,
      total: Number(order.total),
      paymentMethod: pago.metodo,
      cryptoMoneda: pago.criptoMoneda,
      walletDireccion: pago.walletDireccion,
      cryptoTxHash: pago.txHash,
      cryptoConfirmations: pago.confirmacionesOnchain,
      alertReason:
        notification.event === "PAYMENT_REVIEW_OVERDUE"
          ? `SLA de revisión vencido. Este pago lleva más de ${paymentReviewSlaMinutes()} minutos pendiente de validación.`
          : null,
      items: order.items.map((item) => ({
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        subtotal: Number(item.subtotal),
      })),
    },
  };
}

export type PaymentNotificationProcessingResult = {
  status: "DELIVERED" | "FAILED" | "DEAD_LETTER" | "SKIPPED";
  provider?: string | null;
  notification?: PaymentAdminNotificationResult;
};

export async function processPaymentAdminNotification(
  notificationId: string,
): Promise<PaymentNotificationProcessingResult> {
  const now = new Date();
  const claimed = await prisma.paymentAdminNotification.updateMany({
    where: {
      id: notificationId,
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
    },
    data: {
      status: "PROCESSING",
      attempts: { increment: 1 },
      lastAttemptAt: now,
      lastError: null,
    },
  });

  if (claimed.count !== 1) return { status: "SKIPPED" };

  const payload = await loadNotificationPayload(notificationId);
  if (!payload) {
    await prisma.paymentAdminNotification.update({
      where: { id: notificationId },
      data: {
        status: "DEAD_LETTER",
        lastError: "PAYMENT_EVIDENCE_NOT_AVAILABLE",
      },
    });
    return { status: "DEAD_LETTER" };
  }

  try {
    const result = await notifyPaymentAdmin(payload.order, payload.evidence);
    const refreshed = await prisma.paymentAdminNotification.findUnique({
      where: { id: notificationId },
      select: { attempts: true },
    });
    const attempts = refreshed?.attempts ?? 1;

    if (result.delivery === "automatic") {
      await prisma.paymentAdminNotification.update({
        where: { id: notificationId },
        data: {
          status: "DELIVERED",
          provider: result.provider,
          deliveredAt: new Date(),
          lastError: null,
        },
      });
      return { status: "DELIVERED", provider: result.provider, notification: result };
    }

    const exhausted = attempts >= MAX_ATTEMPTS;
    await prisma.paymentAdminNotification.update({
      where: { id: notificationId },
      data: {
        status: exhausted ? "DEAD_LETTER" : "FAILED",
        provider: result.provider,
        lastError: "NO_AUTOMATIC_CHANNEL_DELIVERED",
        nextAttemptAt: retryAt(attempts),
      },
    });
    return {
      status: exhausted ? "DEAD_LETTER" : "FAILED",
      provider: result.provider,
      notification: result,
    };
  } catch (error) {
    const refreshed = await prisma.paymentAdminNotification.findUnique({
      where: { id: notificationId },
      select: { attempts: true },
    });
    const attempts = refreshed?.attempts ?? 1;
    const exhausted = attempts >= MAX_ATTEMPTS;
    await prisma.paymentAdminNotification.update({
      where: { id: notificationId },
      data: {
        status: exhausted ? "DEAD_LETTER" : "FAILED",
        lastError: safeError(error),
        nextAttemptAt: retryAt(attempts),
      },
    });
    return { status: exhausted ? "DEAD_LETTER" : "FAILED" };
  }
}

export async function processDuePaymentAdminNotifications(limit = 20) {
  const escalated = await enqueueOverduePaymentReviewNotifications();
  const due = await prisma.paymentAdminNotification.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      nextAttemptAt: { lte: new Date() },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { nextAttemptAt: "asc" },
    take: Math.min(Math.max(limit, 1), 50),
    select: { id: true },
  });

  const results = [];
  for (const item of due) {
    results.push(await processPaymentAdminNotification(item.id));
  }
  return {
    escalated,
    processed: results.length,
    delivered: results.filter((item) => item.status === "DELIVERED").length,
    failed: results.filter((item) => item.status === "FAILED").length,
    deadLetter: results.filter((item) => item.status === "DEAD_LETTER").length,
  };
}
