import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  buildKevIntelligenceRequest,
  fetchKevIntelligenceSnapshot,
} from "@/lib/governance/kev-intelligence";

process.env.KEV_GOVERNANCE_BRIDGE_URL =
  "https://kev.example/api/kev/governance/pisao/events";
process.env.KEV_GOVERNANCE_BRIDGE_SECRET =
  "test-governance-secret-with-at-least-thirty-two-characters";

test("builds the intelligence mirror request with the governance HMAC", () => {
  const request = buildKevIntelligenceRequest(1_800_000_000);
  assert.ok(request);
  assert.equal(
    request.url,
    "https://kev.example/api/kev/governance/pisao/intelligence",
  );

  const expected =
    "sha256=" +
    createHmac(
      "sha256",
      process.env.KEV_GOVERNANCE_BRIDGE_SECRET!,
    )
      .update("1800000000." + request.body)
      .digest("hex");

  assert.equal(request.timestamp, "1800000000");
  assert.equal(request.signature, expected);
});

test("accepts only the bounded read-only intelligence contract", async () => {
  const result = await fetchKevIntelligenceSnapshot(async () => {
    return Response.json({
      app_id: "pisao-gastrobar",
      source: "kev_cortex_v6",
      contract: "pisao_intelligence_snapshot_v1",
      mode: "recommend_only",
      mutation_authority: false,
      execution_requires_human_approval: true,
      generated_at: 1_800_000_000,
      coverage: {
        event_count: 18,
        sample_quality: "emerging",
        oldest_event_at: 1_799_999_000,
        newest_event_at: 1_800_000_000,
        span_seconds: 1000,
      },
      reservations: {
        attempts_observed: 5,
        rejected_attempts: 1,
        rejection_rate: 0.2,
      },
      concierge: {
        interactions_observed: 8,
        fallbacks: 1,
        provider_errors: 0,
        fallback_rate: 0.125,
      },
      orders: {
        orders_observed: 5,
        cancellation_rate: 0,
      },
      recommendations: [
        {
          code: "continue-observation",
          priority: "monitor",
          title: "Mantener observación",
          rationale: "No se detectaron señales sobre los umbrales.",
          evidence: { event_count: 18 },
          mode: "recommend_only",
          requires_human_approval: true,
          executable_by_kev: false,
        },
      ],
    });
  });

  assert.equal(result.available, true);
  if (result.available) {
    assert.equal(result.data.mutation_authority, false);
    assert.equal(result.data.coverage.event_count, 18);
    assert.equal(result.data.recommendations.length, 1);
  }
});
