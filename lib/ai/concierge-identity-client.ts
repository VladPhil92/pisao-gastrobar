"use client";

export type ConciergeIdentity = {
  guestKey: string;
  sessionKey: string;
};

const GUEST_KEY = "pisao-concierge-guest-id-v1";
const SESSION_KEY = "pisao-concierge-session-id-v1";

function randomKey(prefix: string) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${id.replace(/[^A-Za-z0-9_-]/g, "")}`.slice(0, 96);
}

function loadOrCreate(storage: Storage, key: string, prefix: string) {
  const existing = storage.getItem(key);
  if (existing && /^[A-Za-z0-9_-]{16,96}$/.test(existing)) return existing;

  const created = randomKey(prefix);
  storage.setItem(key, created);
  return created;
}

export function loadConciergeIdentity(): ConciergeIdentity | null {
  if (typeof window === "undefined") return null;

  try {
    return {
      guestKey: loadOrCreate(window.localStorage, GUEST_KEY, "guest"),
      sessionKey: loadOrCreate(window.sessionStorage, SESSION_KEY, "session"),
    };
  } catch {
    return null;
  }
}
