import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CTGONE_STATE_COOKIE = "__Host-pisao_ctgone_state";
export const CTGONE_VERIFIER_COOKIE = "__Host-pisao_ctgone_verifier";

const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const CODE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

export function createFederationState(): string {
  return randomBytes(24).toString("base64url");
}

export function createPkceVerifier(): string {
  return randomBytes(32).toString("base64url");
}

export function pkceChallengeForVerifier(verifier: string): string {
  return createHash("sha256").update(verifier, "utf8").digest("base64url");
}

export function isValidState(value: string | null): value is string {
  return typeof value === "string" && STATE_PATTERN.test(value);
}

export function isValidAuthorizationCode(value: string | null): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value);
}

export function isValidVerifier(value: string | undefined): value is string {
  return typeof value === "string" && VERIFIER_PATTERN.test(value);
}

export function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function federationAuthorizeUrl(): string {
  return process.env.CTGONE_FEDERATION_AUTHORIZE_URL?.trim()
    || "https://ctgone.com/api/federation/pisao/authorize";
}

export function federationExchangeUrl(): string {
  return process.env.CTGONE_FEDERATION_EXCHANGE_URL?.trim()
    || "https://ctgone.com/api/federation/pisao/exchange";
}

export function federationSecret(): string | null {
  const secret = process.env.CTGONE_FEDERATION_SECRET?.trim() ?? "";
  return secret.length >= 32 ? secret : null;
}
