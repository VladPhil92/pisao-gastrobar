import "server-only";

import type { PaymentEvidence } from "@/lib/uploads/evidencia";

export type PaymentAdminOrder = {
  id: string;
  numero: number;
  clienteNombre: string;
  clienteTelefono: string;
  clienteEmail?: string | null;
  tipoEntrega: "DOMICILIO" | "RECOGIDA";
  direccionEntrega?: string | null;
  notas?: string | null;
  total: number;
  items: Array<{
    nombre: string;
    cantidad: number;
    subtotal: number;
  }>;
};

export type PaymentAdminNotificationResult = {
  delivery: "automatic" | "manual";
  provider: "whatsapp_cloud" | "webhook" | "click_to_chat";
  whatsappUrl: string;
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function paymentAdminNumber() {
  return digitsOnly(
    process.env.PAYMENT_ADMIN_WHATSAPP_NUMBER?.trim() || "573186428218",
  );
}

export function buildPaymentAdminMessage(order: PaymentAdminOrder) {
  const items = order.items
    .map(
      (item) =>
        `• ${item.cantidad}x ${item.nombre} — $${Math.round(item.subtotal).toLocaleString("es-CO")}`,
    )
    .join("\n");

  const delivery =
    order.tipoEntrega === "DOMICILIO"
      ? `Domicilio: ${order.direccionEntrega || "Dirección no informada"}`
      : "Entrega: recogida en PISÁO";

  return [
    `🧾 PISÁO · Pago por validar · Pedido #${order.numero}`,
    "",
    `Cliente: ${order.clienteNombre}`,
    `Teléfono: ${order.clienteTelefono}`,
    order.clienteEmail ? `Email: ${order.clienteEmail}` : "",
    delivery,
    "",
    "Pedido:",
    items,
    "",
    `TOTAL: $${Math.round(order.total).toLocaleString("es-CO")} COP`,
    order.notas ? `Notas: ${order.notas}` : "",
    "",
    "El comprobante quedó almacenado en el panel administrativo de PISÁO.",
    "Validar el pago antes de confirmar el pedido.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function paymentAdminWhatsappUrl(message: string) {
  return `https://wa.me/${paymentAdminNumber()}?text=${encodeURIComponent(message)}`;
}

async function notifyViaWhatsAppCloud(
  evidence: PaymentEvidence,
  message: string,
) {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();

  if (!token || !phoneNumberId) return false;

  const version =
    process.env.WHATSAPP_CLOUD_GRAPH_VERSION?.trim() || "v23.0";
  const base = `https://graph.facebook.com/${version}/${phoneNumberId}`;

  const mediaForm = new FormData();
  mediaForm.set("messaging_product", "whatsapp");
  mediaForm.set("type", evidence.mimeType);
  mediaForm.set(
    "file",
    new Blob([evidence.arrayBuffer], { type: evidence.mimeType }),
    evidence.fileName,
  );

  const mediaResponse = await fetch(`${base}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: mediaForm,
    signal: AbortSignal.timeout(8_000),
  });

  if (!mediaResponse.ok) return false;

  const mediaPayload = (await mediaResponse.json()) as { id?: string };
  if (!mediaPayload.id) return false;

  const isNativeImage =
    evidence.mimeType === "image/jpeg" || evidence.mimeType === "image/png";
  const type = isNativeImage ? "image" : "document";
  const caption = message.slice(0, 900);

  const media =
    type === "image"
      ? { id: mediaPayload.id, caption }
      : { id: mediaPayload.id, caption, filename: evidence.fileName };

  const sendResponse = await fetch(`${base}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: paymentAdminNumber(),
      type,
      [type]: media,
    }),
    signal: AbortSignal.timeout(8_000),
  });

  return sendResponse.ok;
}

async function notifyViaWebhook(
  order: PaymentAdminOrder,
  evidence: PaymentEvidence,
  message: string,
) {
  const url = process.env.PAYMENT_ADMIN_NOTIFICATION_WEBHOOK_URL?.trim();
  if (!url?.startsWith("https://")) return false;

  const form = new FormData();
  form.set("event", "pisao.payment.evidence_received");
  form.set(
    "order",
    JSON.stringify({
      ...order,
      adminWhatsapp: paymentAdminNumber(),
      message,
    }),
  );
  form.set(
    "comprobante",
    new Blob([evidence.arrayBuffer], { type: evidence.mimeType }),
    evidence.fileName,
  );

  const secret = process.env.PAYMENT_ADMIN_NOTIFICATION_WEBHOOK_SECRET?.trim();
  const headers: Record<string, string> = {};
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: form,
    signal: AbortSignal.timeout(8_000),
  });

  return response.ok;
}

export async function notifyPaymentAdmin(
  order: PaymentAdminOrder,
  evidence: PaymentEvidence,
): Promise<PaymentAdminNotificationResult> {
  const message = buildPaymentAdminMessage(order);
  const whatsappUrl = paymentAdminWhatsappUrl(message);

  try {
    if (await notifyViaWhatsAppCloud(evidence, message)) {
      return {
        delivery: "automatic",
        provider: "whatsapp_cloud",
        whatsappUrl,
      };
    }
  } catch (error) {
    console.warn("[PISAO PAYMENTS] WhatsApp Cloud notification failed", {
      order: order.numero,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  try {
    if (await notifyViaWebhook(order, evidence, message)) {
      return {
        delivery: "automatic",
        provider: "webhook",
        whatsappUrl,
      };
    }
  } catch (error) {
    console.warn("[PISAO PAYMENTS] Payment webhook notification failed", {
      order: order.numero,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return {
    delivery: "manual",
    provider: "click_to_chat",
    whatsappUrl,
  };
}
