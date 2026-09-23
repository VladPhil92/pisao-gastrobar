import "server-only";

import { POST as runConcierge } from "@/app/api/ai/concierge/route";
import { captureServerError } from "@/lib/observability/sentry-transport";
import type {
  WhatsAppInboundMessage,
  WhatsAppMessageEcho,
} from "@/lib/whatsapp/coexistence";
import { sendWhatsAppText } from "@/lib/whatsapp/cloud-api";
import {
  claimWhatsAppWebhookEvent,
  markWhatsAppWebhookProcessed,
  recordWhatsAppAiOutbound,
  recordWhatsAppHumanEcho,
  recordWhatsAppInbound,
  whatsappHumanHandoffActive,
} from "@/lib/whatsapp/state";
import { deriveWhatsAppIdentity } from "@/lib/whatsapp/webhook-security";

type ConciergePayload = {
  text?: string;
  error?: string;
  action?: {
    type?: string;
  } | null;
};

function whatsappReplyText(payload: ConciergePayload) {
  const base =
    payload.text?.trim() ||
    "Ahora mismo no pude procesar tu mensaje. Nuestro equipo puede ayudarte por este mismo WhatsApp.";

  if (payload.action?.type === "reservation.confirm") {
    return [
      base,
      "",
      "En esta primera versión del canal WhatsApp, la confirmación transaccional final se completa en pisaogastrobar.com/reservas o con apoyo del equipo.",
    ].join("\n");
  }

  if (payload.action?.type === "cart.add_proposal") {
    return [
      base,
      "",
      "Para llevar la propuesta al carrito y finalizar el pedido, continúa en pisaogastrobar.com/pedidos.",
    ].join("\n");
  }

  return base;
}

export async function processWhatsAppHumanEcho(
  echo: WhatsAppMessageEcho,
) {
  const eventKey = `echo:${echo.id}`;
  const claimed = await claimWhatsAppWebhookEvent({
    eventKey,
    field: "smb_message_echoes",
    phoneNumberId: echo.phoneNumberId,
  });
  if (!claimed) return;

  await recordWhatsAppHumanEcho({
    customerWaId: echo.to,
    phoneNumberId: echo.phoneNumberId,
  });
  await markWhatsAppWebhookProcessed(eventKey);
}

export async function processWhatsAppInbound(
  message: WhatsAppInboundMessage,
) {
  const eventKey = `message:${message.id}`;
  const claimed = await claimWhatsAppWebhookEvent({
    eventKey,
    field: "messages",
    phoneNumberId: message.phoneNumberId,
  });
  if (!claimed) return;

  await recordWhatsAppInbound({
    waId: message.from,
    phoneNumberId: message.phoneNumberId,
  });

  if (await whatsappHumanHandoffActive(message.from)) {
    await markWhatsAppWebhookProcessed(eventKey);
    return;
  }

  const identity = deriveWhatsAppIdentity(message.from);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-real-ip": identity.identity,
  };

  const edgeSecret = process.env.PISAO_EDGE_SECRET?.trim();
  if (edgeSecret) headers["x-pisao-edge-secret"] = edgeSecret;

  try {
    const request = new Request(
      "https://pisaogastrobar.com/api/ai/concierge",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: [{ role: "user", content: message.text }],
          guestKey: identity.guestKey,
          sessionKey: identity.sessionKey,
        }),
      },
    );

    const response = await runConcierge(request);
    const payload = (await response.json()) as ConciergePayload;

    if (!response.ok) {
      throw new Error(
        payload.error || `PISÁO Concierge HTTP ${response.status}`,
      );
    }

    await sendWhatsAppText({
      to: message.from,
      body: whatsappReplyText(payload),
      phoneNumberId: message.phoneNumberId,
    });

    await recordWhatsAppAiOutbound({
      waId: message.from,
      phoneNumberId: message.phoneNumberId,
    });
    await markWhatsAppWebhookProcessed(eventKey);
  } catch (error) {
    void captureServerError(error, {
      surface: "whatsapp_concierge",
      code: "WHATSAPP_CONCIERGE_FAILED",
    });

    console.error("[PISAO WHATSAPP] No fue posible procesar mensaje", {
      messageId: message.id,
      error: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
