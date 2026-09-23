import "server-only";

import { randomUUID } from "node:crypto";

type SafeScalar = string | number | boolean | null;
type SafeContext = Record<string, SafeScalar>;

function sentryConfig() {
  const raw = process.env.SENTRY_DSN?.trim();
  if (!raw) return null;

  try {
    const dsn = new URL(raw);
    const projectId = dsn.pathname.split("/").filter(Boolean).at(-1);
    const publicKey = dsn.username;
    if (!projectId || !publicKey || !dsn.hostname) return null;

    return {
      dsn: raw,
      projectId,
      publicKey,
      origin: `${dsn.protocol}//${dsn.host}`,
    };
  } catch {
    return null;
  }
}

export function observabilityHealth() {
  return {
    sentryTransport: sentryConfig() ? "enabled" : "disabled",
    clientErrorRelay: "available",
    piiPolicy: "no_request_bodies",
  };
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      type: error.name.slice(0, 120),
      value: error.message.slice(0, 1200),
      stack: error.stack?.slice(0, 12_000),
    };
  }

  return {
    type: "UnknownError",
    value: String(error).slice(0, 1200),
    stack: undefined,
  };
}

export async function captureServerError(
  error: unknown,
  context: SafeContext = {},
) {
  const normalized = normalizeError(error);
  const config = sentryConfig();

  console.error("[PISAO OBSERVABILITY]", {
    type: normalized.type,
    message: normalized.value,
    ...context,
  });

  if (!config) return { delivered: false, reason: "sentry_disabled" as const };

  const eventId = randomUUID().replaceAll("-", "");
  const envelopeHeader = {
    event_id: eventId,
    sent_at: new Date().toISOString(),
    dsn: config.dsn,
  };
  const itemHeader = { type: "event" };
  const event = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: "javascript",
    level: "error",
    environment: process.env.NODE_ENV ?? "production",
    release: process.env.RENDER_GIT_COMMIT ?? undefined,
    exception: {
      values: [
        {
          type: normalized.type,
          value: normalized.value,
        },
      ],
    },
    extra: normalized.stack ? { stack: normalized.stack } : undefined,
    tags: {
      app: "pisao-gastrobar",
      runtime: "render-nextjs",
      ...context,
    },
  };

  const body = [
    JSON.stringify(envelopeHeader),
    JSON.stringify(itemHeader),
    JSON.stringify(event),
  ].join("\n");

  const url =
    `${config.origin}/api/${config.projectId}/envelope/` +
    `?sentry_version=7&sentry_key=${encodeURIComponent(config.publicKey)}` +
    "&sentry_client=pisao-v7%2F1.0";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });

    return response.ok
      ? { delivered: true as const, eventId }
      : {
          delivered: false as const,
          reason: "sentry_rejected" as const,
          status: response.status,
        };
  } catch {
    return { delivered: false as const, reason: "sentry_unavailable" as const };
  }
}
