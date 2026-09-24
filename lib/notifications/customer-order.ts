import "server-only";

import { prisma } from "@/lib/prisma";
import { issueOrderTrackingAccess } from "@/lib/orders/tracking-access";
import { sendWhatsAppText } from "@/lib/whatsapp/cloud-api";

const MAX_ATTEMPTS = 5;

type CustomerNotificationResult = {
  delivery: "automatic" | "pending";
  provider: "whatsapp_cloud" | "email" | "unavailable";
};

function safeError(error: unknown) {
  const value = error instanceof Error ? error.message : "UnknownError";
  return value.replace(/[\r\n\t]+/g, " ").slice(0, 180);
}

function retryAt(attempts: number) {
  const minutes = [1, 5, 15, 30, 60][
    Math.max(0, Math.min(attempts - 1, 4))
  ];
  return new Date(Date.now() + minutes * 60_000);
}

function publicOrigin() {
  return (
    process.env.PISAO_PUBLIC_ORIGIN?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://pisaogastrobar.com"
  ).replace(/\/$/, "");
}

function eventCopy(params: {
  event: string;
  numero: number;
  tipoEntrega: "DOMICILIO" | "RECOGIDA";
}) {
  const { event, numero, tipoEntrega } = params;

  if (event === "PAYMENT_APPROVED" || event === "ORDER_CONFIRMED") {
    return {
      subject: `PISÁO · Pedido #${numero} confirmado`,
      headline: "Tu pago fue confirmado.",
      detail: "El pedido ya quedó liberado para operación.",
    };
  }

  if (event === "PAYMENT_REJECTED" || event === "ORDER_CANCELLED") {
    return {
      subject: `PISÁO · Revisión del pedido #${numero}`,
      headline: "No pudimos validar el pago de tu pedido.",
      detail:
        "El pedido no continuará por ahora. Revisa el seguimiento o contáctanos si necesitas aclarar la validación.",
    };
  }

  if (event === "ORDER_EN_PREPARACION") {
    return {
      subject: `PISÁO · Pedido #${numero} en preparación`,
      headline: "Tu pedido ya entró a cocina.",
      detail: "Estamos trabajando en tu pedido.",
    };
  }

  if (event === "ORDER_LISTO") {
    return {
      subject: `PISÁO · Pedido #${numero} listo`,
      headline:
        tipoEntrega === "RECOGIDA"
          ? "Tu pedido está listo para recoger."
          : "Tu pedido está listo para despacho.",
      detail:
        tipoEntrega === "RECOGIDA"
          ? "Puedes acercarte a PISÁO para recibirlo."
          : "La preparación terminó y está pendiente de salida.",
    };
  }

  if (event === "ORDER_EN_CAMINO") {
    return {
      subject: `PISÁO · Pedido #${numero} en camino`,
      headline: "Tu pedido va en camino.",
      detail: "Ya salió de PISÁO hacia la dirección registrada.",
    };
  }

  if (event === "ORDER_ENTREGADO") {
    return {
      subject: `PISÁO · Pedido #${numero} entregado`,
      headline: "Tu pedido fue marcado como entregado.",
      detail: "Gracias por elegir PISÁO.",
    };
  }

  return {
    subject: `PISÁO · Actualización del pedido #${numero}`,
    headline: "Tu pedido tiene una actualización.",
    detail: "Consulta el seguimiento para ver el estado más reciente.",
  };
}

async function sendCustomerEmail(params: {
  to: string | null;
  subject: string;
  body: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = params.to?.trim();

  if (!apiKey || !from || !to) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: params.subject,
      text: params.body,
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    console.warn("[PISAO CUSTOMER] Email notification failed", {
      status: response.status,
    });
    return false;
  }
  return true;
}

async function loadPayload(notificationId: string) {
  const notification = await prisma.customerOrderNotification.findUnique({
    where: { id: notificationId },
    include: {
      pedido: {
        select: {
          id: true,
          numero: true,
          clienteNombre: true,
          clienteTelefono: true,
          clienteEmail: true,
          tipoEntrega: true,
          estado: true,
        },
      },
    },
  });

  if (!notification) return null;
  return notification;
}

async function deliverCustomerOrderNotification(
  notificationId: string,
): Promise<CustomerNotificationResult> {
  const notification = await loadPayload(notificationId);
  if (!notification) return { delivery: "pending", provider: "unavailable" };

  const tracking = await issueOrderTrackingAccess(notification.pedidoId);
  const trackingUrl = `${publicOrigin()}${tracking.url}`;
  const copy = eventCopy({
    event: notification.event,
    numero: notification.pedido.numero,
    tipoEntrega: notification.pedido.tipoEntrega,
  });
  const body = [
    `Hola ${notification.pedido.clienteNombre},`,
    "",
    copy.headline,
    copy.detail,
    "",
    `Pedido #${notification.pedido.numero}`,
    `Seguimiento privado: ${trackingUrl}`,
    "",
    "Este enlace permite consultar el estado del pedido y no muestra tus datos personales.",
  ].join("\n");

  try {
    await sendWhatsAppText({
      to: notification.pedido.clienteTelefono,
      body,
    });
    return { delivery: "automatic", provider: "whatsapp_cloud" };
  } catch (error) {
    console.warn("[PISAO CUSTOMER] WhatsApp lifecycle notification failed", {
      order: notification.pedido.numero,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  try {
    if (
      await sendCustomerEmail({
        to: notification.pedido.clienteEmail,
        subject: copy.subject,
        body,
      })
    ) {
      return { delivery: "automatic", provider: "email" };
    }
  } catch (error) {
    console.warn("[PISAO CUSTOMER] Email lifecycle notification failed", {
      order: notification.pedido.numero,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return { delivery: "pending", provider: "unavailable" };
}

export function customerOrderEventForStatus(status: string) {
  if (status === "CONFIRMADO") return "ORDER_CONFIRMED";
  if (status === "EN_PREPARACION") return "ORDER_EN_PREPARACION";
  if (status === "LISTO") return "ORDER_LISTO";
  if (status === "EN_CAMINO") return "ORDER_EN_CAMINO";
  if (status === "ENTREGADO") return "ORDER_ENTREGADO";
  if (status === "CANCELADO") return "ORDER_CANCELLED";
  return null;
}

export function customerOrderNotificationEventKey(params: {
  pedidoId: string;
  event: string;
}) {
  return `CUSTOMER_ORDER:${params.pedidoId}:${params.event}`;
}

export async function enqueueCustomerOrderNotification(params: {
  pedidoId: string;
  event: string;
}) {
  const eventKey = customerOrderNotificationEventKey(params);
  return prisma.customerOrderNotification.upsert({
    where: { eventKey },
    create: {
      eventKey,
      event: params.event,
      pedidoId: params.pedidoId,
      status: "PENDING",
      nextAttemptAt: new Date(),
    },
    update: {},
  });
}

export async function processCustomerOrderNotification(notificationId: string) {
  const now = new Date();
  const claimed = await prisma.customerOrderNotification.updateMany({
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

  if (claimed.count !== 1) return { status: "SKIPPED" as const };

  try {
    const result = await deliverCustomerOrderNotification(notificationId);
    const current = await prisma.customerOrderNotification.findUnique({
      where: { id: notificationId },
      select: { attempts: true },
    });
    const attempts = current?.attempts ?? 1;

    if (result.delivery === "automatic") {
      await prisma.customerOrderNotification.update({
        where: { id: notificationId },
        data: {
          status: "DELIVERED",
          provider: result.provider,
          deliveredAt: new Date(),
          lastError: null,
        },
      });
      return {
        status: "DELIVERED" as const,
        provider: result.provider,
      };
    }

    const exhausted = attempts >= MAX_ATTEMPTS;
    await prisma.customerOrderNotification.update({
      where: { id: notificationId },
      data: {
        status: exhausted ? "DEAD_LETTER" : "FAILED",
        provider: result.provider,
        lastError: "NO_CUSTOMER_CHANNEL_DELIVERED",
        nextAttemptAt: retryAt(attempts),
      },
    });

    return {
      status: exhausted ? ("DEAD_LETTER" as const) : ("FAILED" as const),
      provider: result.provider,
    };
  } catch (error) {
    const current = await prisma.customerOrderNotification.findUnique({
      where: { id: notificationId },
      select: { attempts: true },
    });
    const attempts = current?.attempts ?? 1;
    const exhausted = attempts >= MAX_ATTEMPTS;

    await prisma.customerOrderNotification.update({
      where: { id: notificationId },
      data: {
        status: exhausted ? "DEAD_LETTER" : "FAILED",
        lastError: safeError(error),
        nextAttemptAt: retryAt(attempts),
      },
    });

    return {
      status: exhausted ? ("DEAD_LETTER" as const) : ("FAILED" as const),
    };
  }
}

export async function processDueCustomerOrderNotifications(limit = 20) {
  const due = await prisma.customerOrderNotification.findMany({
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
    results.push(await processCustomerOrderNotification(item.id));
  }

  return {
    processed: results.length,
    delivered: results.filter((item) => item.status === "DELIVERED").length,
    failed: results.filter((item) => item.status === "FAILED").length,
    deadLetter: results.filter((item) => item.status === "DEAD_LETTER").length,
  };
}
