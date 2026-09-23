import { after } from "next/server";
import { captureServerError } from "@/lib/observability/sentry-transport";
import {
  extractWhatsAppInboundMessages,
  processWhatsAppInbound,
} from "@/lib/whatsapp/concierge-adapter";
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

export async function POST(request: Request) {
  const rawBody = await request.text();

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

  if (process.env.WHATSAPP_WEBHOOK_ENABLED !== "true") {
    return new Response("EVENT_RECEIVED", { status: 200 });
  }

  const messages = extractWhatsAppInboundMessages(payload);

  if (messages.length) {
    after(async () => {
      const results = await Promise.allSettled(
        messages.map((message) => processWhatsAppInbound(message)),
      );

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
