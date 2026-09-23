import "server-only";

import { POST as runConcierge } from "@/app/api/ai/concierge/route";
import { captureServerError } from "@/lib/observability/sentry-transport";
import { sendWhatsAppText } from "@/lib/whatsapp/cloud-api";
import { deriveWhatsAppIdentity } from "@/lib/whatsapp/webhook-security";

type WhatsAppInboundMessage = {
  id: string;
  from: string;
  text: string;
};

type ConciergePayload = {
  text?: string;
  error?: string;
  action?: {
    type?: string;
  } | null;
};

const globalWhatsAppState = globalThis as unknown as {
  pisaoWhatsAppSeen?: Map<string, number>;
};

const seen = globalWhatsAppState.pisaoWhatsAppSeen ?? new Map<string, number>();
globalWhatsAppState.pisaoWhatsAppSeen = seen;

function cleanupSeen(now: number) {
  if (seen.size < 1000) return;
  for (const [id, expiresAt] of seen) {
    if (expiresAt <= now) seen.delete(id);
  }
}

function claimMessage(id: string) {
  const now = Date.now();
  cleanupSeen(now);
  const current = seen.get(id);
  if (current && current > now) return false;
  seen.set(id, now + 15 * 60 * 1000);
  return true;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function textFromMessage(message: Record<string, unknown>) {
  const type = typeof message.type === "string" ? message.type : "";

  if (type === "text") {
    const text = asRecord(message.text);
    return typeof text?.body === "string" ? text.body : null;
  }

  if (type === "button") {
    const button = asRecord(message.button);
    return typeof button?.text === "string" ? button.text : null;
  }

  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const buttonReply = asRecord(interactive?.button_reply);
    if (typeof buttonReply?.title === "string") return buttonReply.title;
    const listReply = asRecord(interactive?.list_reply);
    if (typeof listReply?.title === "string") return listReply.title;
  }

  return null;
}

export function extractWhatsAppInboundMessages(
  payload: unknown,
): WhatsAppInboundMessage[] {
  const root = asRecord(payload);
  const entries = Array.isArray(root?.entry) ? root.entry : [];
  const inbound: WhatsAppInboundMessage[] = [];

  for (const entryValue of entries) {
    const entry = asRecord(entryValue);
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];

    for (const changeValue of changes) {
      const change = asRecord(changeValue);
      const value = asRecord(change?.value);
      const messages = Array.isArray(value?.messages) ? value.messages : [];

      for (const messageValue of messages) {
        const message = asRecord(messageValue);
        if (!message) continue;

        const id = typeof message.id === "string" ? message.id : "";
        const from = typeof message.from === "string" ? message.from : "";
        const text = textFromMessage(message)?.trim().slice(0, 1600) ?? "";

        if (id && from && text) {
          inbound.push({ id, from, text });
        }
      }
    }
  }

  return inbound;
}

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

export async function processWhatsAppInbound(
  message: WhatsAppInboundMessage,
) {
  if (!claimMessage(message.id)) return;

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
    });
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
