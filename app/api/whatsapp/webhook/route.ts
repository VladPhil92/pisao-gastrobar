import { after } from "next/server";
import { captureServerError } from "@/lib/observability/sentry-transport";
import {
  processWhatsAppHumanEcho,
  processWhatsAppInbound,
} from "@/lib/whatsapp/concierge-adapter";
import { parseWhatsAppWebhook } from "@/lib/whatsapp/coexistence";
import {
  claimWhatsAppWebhookEvent,
  markWhatsAppWebhookProcessed,
} from "@/lib/whatsapp/state";
import {
  verifyWhatsAppChallengeToken,
  verifyWhatsAppSignature,
} from "@/lib/whatsapp/webhook-security";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (
    mode === "subscribe" &&
    challenge &&
    verifyWhatsAppChallengeToken(token)
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return Response.json(
    { error: "Webhook verification rejected." },
    { status: 403 },
  );
}

async function recordPrivacyPreservingSignal(signal: {
  type: "history" | "smb_app_state_sync" | "account_update";
  phoneNumberId?: string;
  eventKey: string;
}) {
  const claimed = await claimWhatsAppWebhookEvent({
    eventKey: signal.eventKey,
    field: signal.type,
    phoneNumberId: signal.phoneNumberId,
  });
  if (!claimed) return;

  // V2 deliberadamente no persiste historial ni libreta de contactos.
  // Solo registramos que Meta entregó el evento para observabilidad.
  await markWhatsAppWebhookProcessed(signal.eventKey);
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Mientras el canal está desactivado, acusamos recepción sin procesar datos.
  // Esto permite que Meta pruebe entrega sin exigir todavía el App Secret.
  if (process.env.WHATSAPP_WEBHOOK_ENABLED !== "true") {
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  if (
    !verifyWhatsAppSignature({
      rawBody,
      signatureHeader: request.headers.get("x-hub-signature-256"),
    })
  ) {
    return Response.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = parseWhatsAppWebhook(payload);

  if (
    parsed.inbound.length ||
    parsed.echoes.length ||
    parsed.signals.length
  ) {
    after(async () => {
      const tasks = [
        ...parsed.inbound.map((message) => processWhatsAppInbound(message)),
        ...parsed.echoes.map((echo) => processWhatsAppHumanEcho(echo)),
        ...parsed.signals.map((signal) =>
          recordPrivacyPreservingSignal(signal),
        ),
      ];

      const results = await Promise.allSettled(tasks);

      for (const result of results) {
        if (result.status === "rejected") {
          void captureServerError(result.reason, {
            surface: "whatsapp_webhook",
            code: "WHATSAPP_BACKGROUND_PROCESSING_FAILED",
          });
        }
      }
    });
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
}
