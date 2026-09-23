import assert from "node:assert/strict";
import test from "node:test";
import { buildRevenueActionCandidates } from "./revenue-action-core";

const base = {
  paidOrders: 10,
  paymentStarted: 10,
  paymentApprovalRate: 90,
  attributionCoveragePct: 100,
  reservationRequested: 2,
  reservationConfirmationRate: 100,
  assistedOrders: 4,
  assistedAverageTicket: 60000,
  directTrackedOrders: 4,
  directTrackedAverageTicket: 50000,
  products: [
    {
      id: "p1",
      name: "Patacón Callejero",
      slug: "patacon-callejero",
      units: 7,
      revenue: 210000,
      featured: false,
    },
  ],
  pairs: [
    {
      productAId: "p1",
      productAName: "Patacón Callejero",
      productBId: "p2",
      productBName: "Golden Pale Ale",
      orders: 3,
    },
  ],
};

test("proposes only evidence-backed merchandising actions", () => {
  const actions = buildRevenueActionCandidates(base);
  assert.ok(actions.some((action) => action.type === "FEATURE_PRODUCT"));
  assert.ok(actions.some((action) => action.type === "CONCIERGE_PAIRING"));
  const pairing = actions.find((action) => action.type === "CONCIERGE_PAIRING");
  assert.equal(pairing?.executionMode, "SYSTEM_AFTER_APPROVAL");
  assert.equal(pairing?.riskLevel, "LOW");
});

test("does not invent product actions with insufficient samples", () => {
  const actions = buildRevenueActionCandidates({
    ...base,
    paidOrders: 1,
    products: [{ ...base.products[0], units: 1 }],
    pairs: [{ ...base.pairs[0], orders: 1 }],
    assistedOrders: 0,
    directTrackedOrders: 0,
  });

  assert.equal(
    actions.some((action) => action.type === "FEATURE_PRODUCT"),
    false,
  );
  assert.equal(
    actions.some((action) => action.type === "CONCIERGE_PAIRING"),
    false,
  );
});

test("flags operational friction without prescribing discounts", () => {
  const actions = buildRevenueActionCandidates({
    ...base,
    paymentStarted: 8,
    paymentApprovalRate: 50,
    reservationRequested: 8,
    reservationConfirmationRate: 50,
  });

  const payment = actions.find(
    (action) => action.type === "PAYMENT_FRICTION_REVIEW",
  );
  const reservation = actions.find(
    (action) => action.type === "RESERVATION_FRICTION_REVIEW",
  );

  assert.ok(payment);
  assert.ok(reservation);
  assert.equal(payment?.recommendedAction.includes("descuentos"), true);
  assert.equal(payment?.executionMode, "MANUAL_AFTER_APPROVAL");
});

test("assisted AOV difference is framed as a test, not causality", () => {
  const actions = buildRevenueActionCandidates(base);
  const discovery = actions.find(
    (action) => action.type === "CONCIERGE_DISCOVERY",
  );

  assert.ok(discovery);
  assert.equal(discovery?.rationale.includes("no demuestra causalidad"), true);
});


test("does not proactively promote unavailable or low-inventory products", () => {
  const actions = buildRevenueActionCandidates({
    ...base,
    products: [
      {
        ...base.products[0],
        available: true,
        lowInventory: true,
      },
    ],
    pairs: [
      {
        ...base.pairs[0],
        promotable: false,
        costCoverage: "COMPLETE",
        contributionMarginPct: 60,
        profitabilityAdjustment: 5,
      },
    ],
  });

  assert.equal(
    actions.some((action) => action.type === "FEATURE_PRODUCT"),
    false,
  );
  assert.equal(
    actions.some((action) => action.type === "CONCIERGE_PAIRING"),
    false,
  );
});
