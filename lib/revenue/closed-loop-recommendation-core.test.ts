import assert from "node:assert/strict";
import test from "node:test";

import {
  CLOSED_LOOP_MAX_ABS_ADJUSTMENT,
  CLOSED_LOOP_MIN_EXPOSURES,
  closedLoopAdjustment,
} from "./closed-loop-recommendation-core";

test("ignores learning below the minimum evidence floor", () => {
  const result = closedLoopAdjustment({
    productSlug: "golden-pale-ale",
    exposures: CLOSED_LOOP_MIN_EXPOSURES - 1,
    accepted: 10,
    addRatePct: 91,
    matchedPaidOrders: 8,
    paidMatchRatePct: 73,
  });

  assert.equal(result.eligible, false);
  assert.equal(result.adjustment, 0);
});

test("positive evidence creates a bounded positive adjustment", () => {
  const result = closedLoopAdjustment({
    productSlug: "golden-pale-ale",
    exposures: 40,
    accepted: 18,
    addRatePct: 45,
    matchedPaidOrders: 9,
    paidMatchRatePct: 23,
  });

  assert.equal(result.eligible, true);
  assert.ok(result.adjustment > 0);
  assert.ok(result.adjustment <= CLOSED_LOOP_MAX_ABS_ADJUSTMENT);
});

test("weak evidence can reduce rank but never beyond the safety bound", () => {
  const result = closedLoopAdjustment({
    productSlug: "postre-casa",
    exposures: 200,
    accepted: 2,
    addRatePct: 1,
    matchedPaidOrders: 0,
    paidMatchRatePct: 0,
  });

  assert.equal(result.eligible, true);
  assert.ok(result.adjustment < 0);
  assert.ok(result.adjustment >= -CLOSED_LOOP_MAX_ABS_ADJUSTMENT);
});

test("malformed telemetry cannot create unbounded influence", () => {
  const result = closedLoopAdjustment({
    productSlug: "patacon-callejero",
    exposures: Number.POSITIVE_INFINITY,
    accepted: -1,
    addRatePct: 900,
    matchedPaidOrders: -5,
    paidMatchRatePct: Number.NaN,
  });

  assert.equal(result.adjustment, 0);
  assert.equal(result.eligible, false);
});

test("moderate evidence remains a small tie-breaker rather than a dominant score", () => {
  const result = closedLoopAdjustment({
    productSlug: "limonada-coco",
    exposures: 20,
    accepted: 6,
    addRatePct: 30,
    matchedPaidOrders: 3,
    paidMatchRatePct: 15,
  });

  assert.equal(result.eligible, true);
  assert.ok(Math.abs(result.adjustment) < 5);
});
