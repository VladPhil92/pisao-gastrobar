import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const CUSTOMER_SESSION_COOKIE = "pisao_customer_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CustomerSession = {
  sub: string;
  email: string;
  name: string;
  authSource: "local";
  issuedAt: number;
  exp: number;
};

function secret() {
  const value = process.env.AUTH_SECRET?.trim() ?? "";
  return value.length >= 32 ? value : null;
}

function sign(payload: string) {
  const key = secret();
  return key ? createHmac("sha256", key).update(payload, "utf8").digest("base64url") : null;
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createCustomerLocalSession(input: { id: string; email: string; name: string }) {
  const issuedAt = Date.now();
  const payload = Buffer.from(JSON.stringify({
    sub: input.id,
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    authSource: "local",
    issuedAt,
    exp: issuedAt + SESSION_TTL_MS,
  } satisfies CustomerSession), "utf8").toString("base64url");
  const signature = sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

export function readCustomerLocalSession(raw: string | undefined): CustomerSession | null {
  if (!raw) return null;
  const [payload, signature, ...rest] = raw.split(".");
  if (!payload || !signature || rest.length > 0) return null;
  const expected = sign(payload);
  if (!expected || !safeEqual(signature, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CustomerSession;
    if (
      !parsed.sub ||
      !parsed.email ||
      !parsed.name ||
      parsed.authSource !== "local" ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Date.now()
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function customerCookieOptions(maxAge = Math.floor(SESSION_TTL_MS / 1000)) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
