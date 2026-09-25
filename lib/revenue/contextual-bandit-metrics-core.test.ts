import assert from "node:assert/strict";
import test from "node:test";

import { summarizeContextualBanditMetrics } from "./contextual-bandit-metrics-core";

const at = (minutes: number) => new Date(1_800_000_000_000 + minutes * 60_000);

test("separates exploration, holdout and exploit outcomes", () => {
  const result = summarizeContextualBanditMetrics(
    [
      {
        tipo: "concierge_nba_view",
        sessionId: "explore_1",
        productSlug: "limonada-a",
        intent: "bandit_explore",
        createdAt: at(0),
      },
      {
        tipo: "concierge_nba_add",
        sessionId: "explore_1",
        productSlug: "limonada-a",
        intent: "bandit_explore",
        createdAt: at(1),
      },
      {
        tipo: "concierge_nba_view",
        sessionId: "holdout_1",
        productSlug: "limonada-b",
        intent: "bandit_holdout",
        createdAt: at(2),
      },
      {
        tipo: "concierge_nba_view",
        sessionId: "exploit_1",
        productSlug: "limonada-b",
        intent: "bandit_exploit",
        createdAt: at(3),
      },
    ],
    [],
  );

  assert.equal(result.totalExposures, 3);
  assert.equal(
    result.arms.find((arm) => arm.arm === "EXPLORE")?.accepted,
    1,
  );
  assert.equal(
    result.arms.find((arm) => arm.arm === "HOLDOUT")?.accepted,
    0,
  );
});

test("attributes paid matches only inside the same arm-tagged exposure session", () => {
  const result = summarizeContextualBanditMetrics(
    [
      {
        tipo: "concierge_nba_view",
        sessionId: "explore_1",
        productSlug: "limonada-a",
        intent: "bandit_explore",
        createdAt: at(0),
      },
      {
        tipo: "concierge_nba_view",
        sessionId: "holdout_1",
        productSlug: "limonada-b",
        intent: "bandit_holdout",
        createdAt: at(0),
      },
    ],
    [
      {
        id: "paid_1",
        sessionId: "explore_1",
        createdAt: at(10),
        items: [
          {
            productSlug: "limonada-a",
            quantity: 1,
            subtotalCop: 14000,
          },
        ],
      },
    ],
  );

  assert.equal(
    result.arms.find((arm) => arm.arm === "EXPLORE")?.matchedPaidOrders,
    1,
  );
  assert.equal(
    result.arms.find((arm) => arm.arm === "HOLDOUT")?.matchedPaidOrders,
    0,
  );
});

test("untagged historical events do not contaminate V21 arm metrics", () => {
  const result = summarizeContextualBanditMetrics(
    [
      {
        tipo: "concierge_nba_view",
        sessionId: "legacy",
        productSlug: "patacon-callejero",
        intent: null,
        createdAt: at(0),
      },
    ],
    [],
  );

  assert.equal(result.totalExposures, 0);
  assert.equal(result.explorationSharePct, 0);
  assert.equal(result.holdoutSharePct, 0);
});

test("traffic shares remain bounded percentages", () => {
  const events = Array.from({ length: 10 }, (_, index) => ({
    tipo: "concierge_nba_view",
    sessionId: `session_${index}`,
    productSlug: "limonada-a",
    intent: index < 1 ? "bandit_explore" : index < 2 ? "bandit_holdout" : "bandit_exploit",
    createdAt: at(index),
  }));

  const result = summarizeContextualBanditMetrics(events, []);
  assert.equal(result.explorationSharePct, 10);
  assert.equal(result.holdoutSharePct, 10);
});
