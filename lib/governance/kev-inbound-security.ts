import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function inboundSecret() {
  return process.env.KEV_GOVERNANCE_INBOUND_SECRET?.trim() ?? "";
}

export function kevInboundEnabled() {
  return (
    process.env.KEV_GOVERNANCE_INBOUND_ENABLED === "true" &&
    inboundSecret().length >= 32
  );
}

export function verifyKevInboundRequest(params: {
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
  nowSeconds?: number;
}) {
  const secret = inboundSecret();
  if (secret.length < 32) return false;

  const timestamp = Number(params.timestampHeader);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;

  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > MAX_CLOCK_SKEW_SECONDS) return false;

  const prefix = "sha256=";
  if (!params.signatureHeader?.startsWith(prefix)) return false;

  const received = params.signatureHeader.slice(prefix.length).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;

  const expected = createHmac("sha256", secret)
    .update(String(timestamp) + "." + params.rawBody)
    .digest("hex");

  return safeEqual(received, expected);
}
