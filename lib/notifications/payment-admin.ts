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
  paymentMethod?: "QR_TRANSFERENCIA" | "CRIPTO" | "TARJETA";
  cryptoMoneda?: string | null;
  cryptoRed?: string | null;
  walletDireccion?: string | null;
  cryptoTxHash?: string | null;
  cryptoAmount?: string | null;
  cryptoConfirmations?: number | null;
  cryptoExplorerUrl?: string | null;
  alertReason?: string | null;
  items: Array<{
    nombre: string;
    cantidad: number;
    subtotal: number;
  }>;
};

export type PaymentAdminNotificationResult = {
  delivery: "automatic" | "manual";
  provider: "whatsapp_cloud" | "email" | "webhook" | "click_to_chat";
  whatsappUrl: string;
};

export type CryptoConfirmationAdminInput = {
  numero: number;
  clienteNombre: string;
  totalCop: number;
  moneda: string;
  red: string;
  txHash: string;
  amount: string;
  confirmations: number;
  requiredConfirmations: number;
  explorerUrl: string;
  evidenceReceived: boolean;
};

export type CryptoConfirmationNotificationResult = {
  delivery: "automatic" | "pending";
  provider: "whatsapp_cloud" | "email" | "webhook" | "unavailable";
};

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function paymentAdminNumber() {
  return digitsOnly(
    process.env.PAYMENT_ADMIN_WHATSAPP_NUMBER?.trim() || "573186428218",
  );
}

function paymentAdminEmail() {
  return process.env.PAYMENT_ADMIN_NOTIFY_EMAIL?.trim() || "";
}

function adminOrdersUrl() {
  const origin =
    process.env.PISAO_PUBLIC_ORIGIN?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://pisaogastrobar.com";

  return `${origin.replace(/\/$/, "")}/admin/pedidos`;
}

async function notifyPaymentAdminEmail(params: {
  orderNumber: number;
  subject: string;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const to = paymentAdminEmail();

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
      text: [
        params.message,
        "",
        `Revisar y aprobar en el dashboard: ${adminOrdersUrl()}`,
        "",
        "El comprobante permanece almacenado de forma segura en PISÁO y no se adjunta al correo.",
      ].join("\n"),
    }),
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    console.warn("[PISAO PAYMENTS] Admin email notification failed", {
      order: params.orderNumber,
      status: response.status,
    });
    return false;
  }

  return true;
}

export async function sendPaymentAdminTestEmail() {
  return notifyPaymentAdminEmail({
    orderNumber: 0,
    subject: "PISÁO · Prueba de alertas administrativas",
    message: [
      "Prueba sintética de Payment Operations Reliability V2.",
      "No corresponde a una venta ni a un pago real.",
      `Fecha: ${new Date().toISOString()}`,
    ].join("\n"),
  });
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

  const paymentDetails =
    order.paymentMethod === "CRIPTO"
      ? [
          `Pago: Criptomoneda · ${order.cryptoMoneda || "Sin especificar"}`,
          order.cryptoRed ? `Red: ${order.cryptoRed}` : "",
          order.walletDireccion ? `Wallet: ${order.walletDireccion}` : "",
          order.cryptoTxHash ? `TxID/TxHash: ${order.cryptoTxHash}` : "",
          order.cryptoAmount && order.cryptoMoneda
            ? `Recibido on-chain: ${order.cryptoAmount} ${order.cryptoMoneda}`
            : "",
          order.cryptoConfirmations !== null &&
          order.cryptoConfirmations !== undefined
            ? `Confirmaciones on-chain al recibir evidencia: ${order.cryptoConfirmations}`
            : "",
          order.cryptoExplorerUrl
            ? `Explorador: ${order.cryptoExplorerUrl}`
            : "",
        ]
      : order.paymentMethod === "QR_TRANSFERENCIA"
        ? ["Pago: QR · Bre-B · Bancolombia"]
        : [];

  return [
    `🧾 PISÁO · Pago por validar · Pedido #${order.numero}`,
    order.alertReason ? `⚠️ ${order.alertReason}` : "",
    "",
    `Cliente: ${order.clienteNombre}`,
    `Teléfono: ${order.clienteTelefono}`,
    order.clienteEmail ? `Email: ${order.clienteEmail}` : "",
    delivery,
    ...paymentDetails,
    "",
    "Pedido:",
    items,
    "",
    `TOTAL: $${Math.round(order.total).toLocaleString("es-CO")} COP`,
    order.notas ? `Notas: ${order.notas}` : "",
    "",
    "El comprobante quedó almacenado en el panel administrativo de PISÁO.",
    order.paymentMethod === "CRIPTO"
      ? "La transacción ya fue prevalidada on-chain; confirmar monto y confirmaciones antes de aprobar."
      : "Validar el pago antes de confirmar el pedido.",
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

async function notifyTextViaWhatsAppCloud(message: string) {
  const token = process.env.WHATSAPP_CLOUD_API_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) return false;

  const version =
    process.env.WHATSAPP_CLOUD_GRAPH_VERSION?.trim() || "v23.0";
  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: paymentAdminNumber(),
        type: "text",
        text: { preview_url: true, body: message.slice(0, 3900) },
      }),
      signal: AbortSignal.timeout(8_000),
    },
  );
  return response.ok;
}

async function notifyCryptoConfirmationViaWebhook(
  input: CryptoConfirmationAdminInput,
  message: string,
) {
  const url = process.env.PAYMENT_ADMIN_NOTIFICATION_WEBHOOK_URL?.trim();
  if (!url?.startsWith("https://")) return false;

  const secret = process.env.PAYMENT_ADMIN_NOTIFICATION_WEBHOOK_SECRET?.trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      event: "pisao.payment.crypto_confirmed",
      adminWhatsapp: paymentAdminNumber(),
      message,
      payment: input,
    }),
    signal: AbortSignal.timeout(8_000),
  });
  return response.ok;
}

export function buildCryptoConfirmationAdminMessage(
  input: CryptoConfirmationAdminInput,
) {
  return [
    `✅ PISÁO · Cripto confirmada · Pedido #${input.numero}`,
    "",
    `Cliente: ${input.clienteNombre}`,
    `Total pedido: ${Math.round(input.totalCop).toLocaleString("es-CO")} COP`,
    `Activo: ${input.moneda}`,
    `Red: ${input.red}`,
    `Recibido: ${input.amount} ${input.moneda}`,
    `Confirmaciones: ${input.confirmations}/${input.requiredConfirmations}`,
    `TxID/TxHash: ${input.txHash}`,
    `Explorador: ${input.explorerUrl}`,
    "",
    input.evidenceReceived
      ? "El comprobante ya está almacenado. El pago está listo para revisión y aprobación humana en el panel."
      : "La blockchain ya confirmó el pago. Aún falta recibir el comprobante del cliente antes de la aprobación administrativa.",
  ].join("\n");
}

export async function notifyCryptoConfirmationAdmin(
  input: CryptoConfirmationAdminInput,
): Promise<CryptoConfirmationNotificationResult> {
  const message = buildCryptoConfirmationAdminMessage(input);

  try {
    if (await notifyTextViaWhatsAppCloud(message)) {
      return { delivery: "automatic", provider: "whatsapp_cloud" };
    }
  } catch (error) {
    console.warn("[PISAO PAYMENTS] Crypto WhatsApp confirmation failed", {
      order: input.numero,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }

  const [emailFallback, webhookFallback] = await Promise.allSettled([
    notifyPaymentAdminEmail({
      orderNumber: input.numero,
      subject: `PISÁO · Pago cripto confirmado · Pedido #${input.numero}`,
      message,
    }),
    notifyCryptoConfirmationViaWebhook(input, message),
  ]);

  if (emailFallback.status === "fulfilled" && emailFallback.value) {
    return { delivery: "automatic", provider: "email" };
  }
  if (emailFallback.status === "rejected") {
    console.warn("[PISAO PAYMENTS] Crypto confirmation email failed", {
      order: input.numero,
      error:
        emailFallback.reason instanceof Error
          ? emailFallback.reason.name
          : "UnknownError",
    });
  }

  if (webhookFallback.status === "fulfilled" && webhookFallback.value) {
    return { delivery: "automatic", provider: "webhook" };
  }
  if (webhookFallback.status === "rejected") {
    console.warn("[PISAO PAYMENTS] Crypto confirmation webhook failed", {
      order: input.numero,
      error:
        webhookFallback.reason instanceof Error
          ? webhookFallback.reason.name
          : "UnknownError",
    });
  }

  return { delivery: "pending", provider: "unavailable" };
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

  const [emailFallback, webhookFallback] = await Promise.allSettled([
    notifyPaymentAdminEmail({
      orderNumber: order.numero,
      subject: `PISÁO · Pago por validar · Pedido #${order.numero}`,
      message,
    }),
    notifyViaWebhook(order, evidence, message),
  ]);

  if (emailFallback.status === "fulfilled" && emailFallback.value) {
    return {
      delivery: "automatic",
      provider: "email",
      whatsappUrl,
    };
  }
  if (emailFallback.status === "rejected") {
    console.warn("[PISAO PAYMENTS] Payment email notification failed", {
      order: order.numero,
      error:
        emailFallback.reason instanceof Error
          ? emailFallback.reason.name
          : "UnknownError",
    });
  }

  if (webhookFallback.status === "fulfilled" && webhookFallback.value) {
    return {
      delivery: "automatic",
      provider: "webhook",
      whatsappUrl,
    };
  }
  if (webhookFallback.status === "rejected") {
    console.warn("[PISAO PAYMENTS] Payment webhook notification failed", {
      order: order.numero,
      error:
        webhookFallback.reason instanceof Error
          ? webhookFallback.reason.name
          : "UnknownError",
    });
  }

  return {
    delivery: "manual",
    provider: "click_to_chat",
    whatsappUrl,
  };
}
