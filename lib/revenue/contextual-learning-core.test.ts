import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTEXTUAL_OUTCOME_WINDOW_MS,
  summarizeContextualCommerceLearning,
} from "./contextual-learning-core";

const at = (minutes: number) => new Date(1_800_000_000_000 + minutes * 60_000);

test("deduplicates repeated exposures per session and product", () => {
  const result = summarizeContextualCommerceLearning(
    [
      {
        tipo: "concierge_nba_view",
        sessionId: "session_a",
        productSlug: "golden-pale-ale",
        createdAt: at(0),
      },
      {
        tipo: "concierge_nba_view",
        sessionId: "session_a",
        productSlug: "golden-pale-ale",
        createdAt: at(1),
      },
      {
        tipo: "concierge_nba_view",
        sessionId: "session_b",
        productSlug: "golden-pale-ale",
        createdAt: at(2),
      },
    ],
    [],
  );

  assert.equal(result.exposures, 2);
  assert.equal(result.products[0]?.exposures, 2);
});

test("counts explicit add only when preceded by an exposure inside the window", () => {
  const result = summarizeContextualCommerceLearning(
    [
      {
        tipo: "concierge_nba_add",
        sessionId: "no_view",
        productSlug: "golden-pale-ale",
        createdAt: at(1),
      },
      {
        tipo: "concierge_nba_view",
        sessionId: "accepted",
        productSlug: "golden-pale-ale",
        createdAt: at(2),
      },
      {
        tipo: "concierge_nba_add",
        sessionId: "accepted",
        productSlug: "golden-pale-ale",
        createdAt: at(3),
      },
    ],
    [],
  );

  assert.equal(result.exposures, 1);
  assert.equal(result.accepted, 1);
  assert.equal(result.addRatePct, 100);
});

test("matches paid product only in the same first-party session after exposure", () => {
  const result = summarizeContextualCommerceLearning(
    [
      {
        tipo: "concierge_nba_view",
        sessionId: "session_a",
        productSlug: "golden-pale-ale",
        createdAt: at(0),
      },
    ],
    [
      {
        id: "order_wrong_session",
        sessionId: "session_b",
        createdAt: at(10),
        items: [
          {
            productSlug: "golden-pale-ale",
            quantity: 2,
            subtotalCop: 36000,
          },
        ],
      },
      {
        id: "order_match",
        sessionId: "session_a",
        createdAt: at(20),
        items: [
          {
            productSlug: "golden-pale-ale",
            quantity: 2,
            subtotalCop: 36000,
          },
          {
            productSlug: "patacon-callejero",
            quantity: 1,
            subtotalCop: 28000,
          },
        ],
      },
    ],
  );

  assert.equal(result.matchedPaidOrders, 1);
  assert.equal(result.matchedPaidUnits, 2);
  assert.equal(result.matchedProductRevenueCop, 36000);
  assert.equal(result.products[0]?.paidMatchRatePct, 100);
});

test("does not attribute purchases outside the 12-hour observation window", () => {
  const start = new Date(1_800_000_000_000);
  const tooLate = new Date(start.getTime() + CONTEXTUAL_OUTCOME_WINDOW_MS + 1);

  const result = summarizeContextualCommerceLearning(
    [
      {
        tipo: "concierge_nba_view",
        sessionId: "session_a",
        productSlug: "golden-pale-ale",
        createdAt: start,
      },
    ],
    [
      {
        id: "order_late",
        sessionId: "session_a",
        createdAt: tooLate,
        items: [
          {
            productSlug: "golden-pale-ale",
            quantity: 1,
            subtotalCop: 18000,
          },
        ],
      },
    ],
  );

  assert.equal(result.matchedPaidOrders, 0);
  assert.equal(result.matchedProductRevenueCop, 0);
});

test("keeps product-level associations descriptive and bounded", () => {
  const result = summarizeContextualCommerceLearning(
    [
      {
        tipo: "concierge_nba_view",
        sessionId: "session_a",
        productSlug: "golden-pale-ale",
        createdAt: at(0),
      },
      {
        tipo: "concierge_nba_view",
        sessionId: "session_a",
        productSlug: "postre-casa",
        createdAt: at(1),
      },
      {
        tipo: "concierge_nba_add",
        sessionId: "session_a",
        productSlug: "postre-casa",
        createdAt: at(2),
      },
    ],
    [
      {
        id: "order_a",
        sessionId: "session_a",
        createdAt: at(10),
        items: [
          {
            productSlug: "postre-casa",
            quantity: 1,
            subtotalCop: 16000,
          },
        ],
      },
    ],
  );

  assert.equal(result.exposures, 2);
  assert.equal(result.accepted, 1);
  assert.equal(result.matchedPaidOrders, 1);
  assert.equal(
    result.products.find((item) => item.productSlug === "postre-casa")
      ?.matchedPaidOrders,
    1,
  );
  assert.equal(
    result.products.find((item) => item.productSlug === "golden-pale-ale")
      ?.matchedPaidOrders,
    0,
  );
});
