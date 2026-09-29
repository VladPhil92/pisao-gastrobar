import { captureServerError } from "@/lib/observability/sentry-transport";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";

const FAILURE_KINDS = new Set([
  "network",
  "timeout",
  "http_retryable",
  "unknown",
]);

function safeString(value: unknown, max = 96) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeInteger(value: unknown, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(min, Math.min(max, Math.round(value)));
}

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json(
      { error: "Origen de solicitud no permitido." },
      { status: 403 },
    );
  }

  const rate = checkRateLimit({
    key: `concierge-client-failure:${requestIdentity(request)}`,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return new Response(null, { status: 204 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rawKind = safeString(body.kind, 32);
  const kind = FAILURE_KINDS.has(rawKind) ? rawKind : "unknown";
  const report = {
    requestId: safeString(body.requestId, 96) || "unavailable",
    attempts: safeInteger(body.attempts, 1, 6) ?? 1,
    kind,
    status: safeInteger(body.status, 100, 599),
    elapsedMs: safeInteger(body.elapsedMs, 0, 120_000) ?? 0,
    online: body.online === true,
    visibility: safeString(body.visibility, 24) || "unknown",
  };

  console.warn("[PISAO AI] Concierge client transport degraded", report);

  void captureServerError(
    new Error(`Concierge client transport degraded: ${kind}`),
    {
      surface: "concierge_client_transport",
      request_id: report.requestId,
      attempts: report.attempts,
      kind: report.kind,
      status: report.status ?? "none",
      elapsed_ms: report.elapsedMs,
      navigator_online: report.online,
      visibility: report.visibility,
    },
  );

  return new Response(null, { status: 204 });
}
