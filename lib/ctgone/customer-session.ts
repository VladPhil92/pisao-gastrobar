import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const CTGONE_SESSION_COOKIE = "__Host-pisao_ctgone_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

type CustomerSessionPayload = {
  sub: string;
  email: string;
  emailVerified: true;
  iat: number;
  exp: number;
};

export type CtgOneCustomerSession = Pick<CustomerSessionPayload, "sub" | "email" | "emailVerified">;

function sessionSecret(): string | null {
  const secret = process.env.CTGONE_CUSTOMER_SESSION_SECRET?.trim() ?? "";
  return secret.length >= 32 ? secret : null;
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload, "utf8").digest("base64url");
}

export function createCustomerSessionToken(identity: CtgOneCustomerSession): string | null {
  const secret = sessionSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload: CustomerSessionPayload = {
    ...identity,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export function parseCustomerSessionToken(token: string | undefined): CtgOneCustomerSession | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;

  const [encodedPayload, suppliedSignature, ...extra] = token.split(".");
  if (!encodedPayload || !suppliedSignature || extra.length > 0) return null;

  const expectedSignature = sign(encodedPayload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Partial<CustomerSessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.sub !== "string"
      || payload.sub.length < 8
      || typeof payload.email !== "string"
      || payload.emailVerified !== true
      || typeof payload.exp !== "number"
      || payload.exp <= now
    ) {
      return null;
    }
    return { sub: payload.sub, email: payload.email, emailVerified: true };
  } catch {
    return null;
  }
}

export async function getCtgOneCustomerSession(): Promise<CtgOneCustomerSession | null> {
  const cookieStore = await cookies();
  return parseCustomerSessionToken(cookieStore.get(CTGONE_SESSION_COOKIE)?.value);
}

export const customerSessionCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
