import "server-only";

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  challenge_ts?: string;
  "error-codes"?: string[];
};

export type TurnstileResult =
  | { ok: true; mode: "disabled" | "verified" }
  | { ok: false; code: string };

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function turnstileEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export function turnstileHealth() {
  return {
    serverValidation: turnstileEnabled() ? "enabled" : "disabled",
    publicWidget: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
      ? "configured"
      : "missing",
    expectedHostname: process.env.TURNSTILE_EXPECTED_HOSTNAME
      ? "configured"
      : "not_enforced",
  };
}

function allowedHostnames() {
  return (process.env.TURNSTILE_EXPECTED_HOSTNAME ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export async function verifyTurnstile(params: {
  token: unknown;
  remoteIp?: string | null;
  expectedAction?: string;
}): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) return { ok: true, mode: "disabled" };

  if (
    typeof params.token !== "string" ||
    !params.token.trim() ||
    params.token.length > 2048
  ) {
    return { ok: false, code: "TURNSTILE_TOKEN_REQUIRED" };
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret,
        response: params.token,
        remoteip: params.remoteIp || undefined,
        idempotency_key: crypto.randomUUID(),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      return { ok: false, code: "TURNSTILE_VERIFY_UNAVAILABLE" };
    }

    const payload = (await response.json()) as TurnstileResponse;
    if (!payload.success) {
      const code = payload["error-codes"]?.[0] ?? "TURNSTILE_REJECTED";
      return { ok: false, code };
    }

    if (
      params.expectedAction &&
      payload.action &&
      payload.action !== params.expectedAction
    ) {
      return { ok: false, code: "TURNSTILE_ACTION_MISMATCH" };
    }

    const hosts = allowedHostnames();
    if (
      hosts.length &&
      (!payload.hostname || !hosts.includes(payload.hostname.toLowerCase()))
    ) {
      return { ok: false, code: "TURNSTILE_HOSTNAME_MISMATCH" };
    }

    return { ok: true, mode: "verified" };
  } catch {
    return { ok: false, code: "TURNSTILE_VERIFY_UNAVAILABLE" };
  }
}
