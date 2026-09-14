import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const CTG_ONE_ORIGIN = (process.env.CTG_ONE_ORIGIN || "https://ctgone.com").replace(/\/$/, "");
export const CTG_ONE_TRANSACTION_COOKIE = "pisao_ctgone_tx";
export const CTG_ONE_SESSION_COOKIE = "pisao_ctgone_session";

const TRANSACTION_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

type FederationTransaction = {
  state: string;
  verifier: string;
  next: string;
  exp: number;
};

export type CtgOneCustomerSession = {
  sub: string;
  email: string;
  emailVerified: true;
  issuedAt: number;
  exp: number;
};

function federationSecret(): string | null {
  const value = process.env.PISAO_FEDERATION_SECRET?.trim() ?? "";
  return value.length >= 32 ? value : null;
}

export function isCtgOneFederationConfigured(): boolean {
  return federationSecret() !== null;
}

function signPayload(payload: string): string | null {
  const secret = federationSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function encodeSigned(value: object): string | null {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  const signature = signPayload(payload);
  return signature ? `${payload}.${signature}` : null;
}

function decodeSigned<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  const [payload, signature, ...rest] = raw.split(".");
  if (!payload || !signature || rest.length > 0) return null;
  const expected = signPayload(payload);
  if (!expected || !safeEqual(signature, expected)) return null;

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function normalizeFederationNext(value: string | null | undefined): string {
  const candidate = value?.trim() ?? "";
  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.length > 512) {
    return "/micuenta";
  }
  return candidate;
}

export function createFederationTransaction(nextValue: string | null | undefined): {
  state: string;
  challenge: string;
  cookieValue: string;
} | null {
  if (!isCtgOneFederationConfigured()) return null;

  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier, "utf8").digest("base64url");
  const transaction: FederationTransaction = {
    state,
    verifier,
    next: normalizeFederationNext(nextValue),
    exp: Date.now() + TRANSACTION_TTL_MS,
  };
  const cookieValue = encodeSigned(transaction);
  return cookieValue ? { state, challenge, cookieValue } : null;
}

export function readFederationTransaction(raw: string | undefined): FederationTransaction | null {
  const transaction = decodeSigned<FederationTransaction>(raw);
  if (!transaction) return null;
  if (!STATE_PATTERN.test(transaction.state) || !VERIFIER_PATTERN.test(transaction.verifier)) return null;
  if (typeof transaction.exp !== "number" || transaction.exp <= Date.now()) return null;
  return { ...transaction, next: normalizeFederationNext(transaction.next) };
}

export function isValidFederationCallback(code: string | null, state: string | null): boolean {
  return Boolean(code && state && CODE_PATTERN.test(code) && STATE_PATTERN.test(state));
}

export function federationStateMatches(left: string, right: string): boolean {
  return safeEqual(left, right);
}

export function createCustomerSession(subject: string, email: string): string | null {
  const normalizedEmail = email.trim().toLowerCase();
  if (!subject || !normalizedEmail || !normalizedEmail.includes("@")) return null;
  const issuedAt = Date.now();
  return encodeSigned({
    sub: subject,
    email: normalizedEmail,
    emailVerified: true,
    issuedAt,
    exp: issuedAt + SESSION_TTL_MS,
  } satisfies CtgOneCustomerSession);
}

export function readCustomerSession(raw: string | undefined): CtgOneCustomerSession | null {
  const session = decodeSigned<CtgOneCustomerSession>(raw);
  if (!session) return null;
  if (!session.sub || !session.email || session.emailVerified !== true) return null;
  if (typeof session.exp !== "number" || session.exp <= Date.now()) return null;
  return session;
}

export function federationCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export const CTG_ONE_TRANSACTION_MAX_AGE_SECONDS = Math.floor(TRANSACTION_TTL_MS / 1000);
export const CTG_ONE_SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);
