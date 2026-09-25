import assert from "node:assert/strict";
import test from "node:test";

import { behaviorEventSchema } from "./behavioral-contract";

const base = {
  sessionId: "session_v19_12345",
  pathname: "/",
  surface: "concierge" as const,
};

test("accepts contextual recommendation exposure with bounded product dimensions", () => {
  const result = behaviorEventSchema.safeParse({
    ...base,
    eventName: "concierge_nba_view",
    productSlug: "golden-pale-ale",
    categorySlug: "cervezas",
  });

  assert.equal(result.success, true);
});

test("accepts explicit contextual recommendation add", () => {
  const result = behaviorEventSchema.safeParse({
    ...base,
    eventName: "concierge_nba_add",
    productSlug: "patacon-callejero",
    categorySlug: "patacones-insignia",
  });

  assert.equal(result.success, true);
});

test("rejects free-text telemetry fields", () => {
  const result = behaviorEventSchema.safeParse({
    ...base,
    eventName: "concierge_nba_view",
    productSlug: "golden-pale-ale",
    message: "mi texto privado del chat",
  });

  assert.equal(result.success, false);
});

test("rejects malformed product identifiers", () => {
  const result = behaviorEventSchema.safeParse({
    ...base,
    eventName: "concierge_nba_add",
    productSlug: "Golden Pale Ale!!!",
  });

  assert.equal(result.success, false);
});


test("accepts V21 contextual bandit arm tags on recommendation telemetry", () => {
  for (const intent of [
    "bandit_exploit",
    "bandit_explore",
    "bandit_holdout",
  ] as const) {
    const result = behaviorEventSchema.safeParse({
      ...base,
      eventName: "concierge_nba_view",
      productSlug: "golden-pale-ale",
      intent,
    });
    assert.equal(result.success, true);
  }
});

test("rejects arbitrary experiment labels in the intent dimension", () => {
  const result = behaviorEventSchema.safeParse({
    ...base,
    eventName: "concierge_nba_view",
    productSlug: "golden-pale-ale",
    intent: "bandit_force_winner",
  });

  assert.equal(result.success, false);
});
