import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyWhatsAppChallengeToken(received: string | null) {
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();
  if (!expected || !received) return false;
  return safeEqual(received, expected);
}

export function verifyWhatsAppSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  const appSecret = process.env.WHATSAPP_META_APP_SECRET?.trim();
  if (!appSecret || !params.signatureHeader) return false;

  const prefix = "sha256=";
  if (!params.signatureHeader.startsWith(prefix)) return false;

  const received = params.signatureHeader.slice(prefix.length);
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;

  const expected = createHmac("sha256", appSecret)
    .update(params.rawBody, "utf8")
    .digest("hex");

  return safeEqual(received.toLowerCase(), expected.toLowerCase());
}

export function deriveWhatsAppIdentity(waId: string) {
  const secret =
    process.env.WHATSAPP_META_APP_SECRET?.trim() ||
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim();

  if (!secret) {
    throw new Error("WHATSAPP_IDENTITY_SECRET_UNAVAILABLE");
  }

  const guestDigest = createHmac("sha256", secret)
    .update(`guest:${waId}`, "utf8")
    .digest("hex");
  const sessionDigest = createHmac("sha256", secret)
    .update(`session:${waId}`, "utf8")
    .digest("hex");

  return {
    guestKey: `wa_guest_${guestDigest.slice(0, 48)}`,
    sessionKey: `wa_session_${sessionDigest.slice(0, 46)}`,
    identity: `wa_${sessionDigest.slice(0, 40)}`,
  };
}
