import "server-only";

import { createHmac } from "node:crypto";
import { z } from "zod";

const APP_ID = "pisao-gastrobar";

const recommendationSchema = z.object({
  code: z.string().max(96),
  priority: z.string().max(24),
  title: z.string().max(180),
  rationale: z.string().max(2000),
  evidence: z.record(z.string(), z.unknown()).default({}),
  mode: z.literal("recommend_only"),
  requires_human_approval: z.literal(true),
  executable_by_kev: z.literal(false),
});

const intelligenceSchema = z.object({
  app_id: z.literal(APP_ID),
  source: z.literal("kev_cortex_v6"),
  contract: z.literal("pisao_intelligence_snapshot_v1"),
  mode: z.literal("recommend_only"),
  mutation_authority: z.literal(false),
  execution_requires_human_approval: z.literal(true),
  generated_at: z.number(),
  coverage: z.object({
    event_count: z.number().int().nonnegative(),
    sample_quality: z.enum(["insufficient", "emerging", "established"]),
    oldest_event_at: z.number().nullable(),
    newest_event_at: z.number().nullable(),
    span_seconds: z.number().nonnegative(),
  }),
  reservations: z.object({
    attempts_observed: z.number().int().nonnegative(),
    rejected_attempts: z.number().int().nonnegative(),
    rejection_rate: z.number().min(0).max(1),
  }).passthrough(),
  concierge: z.object({
    interactions_observed: z.number().int().nonnegative(),
    fallbacks: z.number().int().nonnegative(),
    provider_errors: z.number().int().nonnegative(),
    fallback_rate: z.number().min(0).max(1),
  }).passthrough(),
  orders: z.object({
    orders_observed: z.number().int().nonnegative(),
    cancellation_rate: z.number().min(0).max(1),
  }).passthrough(),
  recommendations: z.array(recommendationSchema).max(20),
});

export type KevIntelligenceSnapshot = z.infer<typeof intelligenceSchema>;

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function config() {
  const bridgeUrl = process.env.KEV_GOVERNANCE_BRIDGE_URL?.trim() ?? "";
  const explicitUrl =
    process.env.KEV_GOVERNANCE_INTELLIGENCE_URL?.trim() ?? "";
  const url =
    explicitUrl ||
    (bridgeUrl.endsWith("/events")
      ? bridgeUrl.replace(/\/events$/, "/intelligence")
      : "");
  return {
    url,
    secret: process.env.KEV_GOVERNANCE_BRIDGE_SECRET?.trim() ?? "",
  };
}

export function kevIntelligenceEnabled() {
  const current = config();
  return current.url.startsWith("https://") && current.secret.length >= 32;
}

export function buildKevIntelligenceRequest(nowSeconds?: number) {
  const { url, secret } = config();
  if (!url.startsWith("https://") || secret.length < 32) return null;

  const body = JSON.stringify({
    app_id: APP_ID,
    operation: "intelligence_snapshot",
  });
  const timestamp = String(
    nowSeconds ?? Math.floor(Date.now() / 1000),
  );
  const signature = createHmac("sha256", secret)
    .update(timestamp + "." + body)
    .digest("hex");

  return {
    url,
    body,
    timestamp,
    signature: "sha256=" + signature,
  };
}

export async function fetchKevIntelligenceSnapshot(
  fetchImpl: FetchLike = fetch,
): Promise<
  | { available: true; data: KevIntelligenceSnapshot }
  | { available: false; reason: string; status?: number }
> {
  const request = buildKevIntelligenceRequest();
  if (!request) {
    return { available: false, reason: "intelligence_channel_disabled" };
  }

  try {
    const response = await fetchImpl(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pisao-Timestamp": request.timestamp,
        "X-Pisao-Signature": request.signature,
      },
      body: request.body,
      cache: "no-store",
      signal: AbortSignal.timeout(2_500),
    });

    if (!response.ok) {
      return {
        available: false,
        reason: "kev_intelligence_rejected",
        status: response.status,
      };
    }

    const parsed = intelligenceSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { available: false, reason: "invalid_intelligence_contract" };
    }

    return { available: true, data: parsed.data };
  } catch (error) {
    return {
      available: false,
      reason:
        error instanceof Error
          ? "kev_intelligence_" + error.name.toLowerCase()
          : "kev_intelligence_unavailable",
    };
  }
}
