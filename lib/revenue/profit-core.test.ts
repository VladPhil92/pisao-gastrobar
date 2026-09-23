import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateOrderContribution,
  calculatePairEconomics,
} from "./profit-core";

test("pair economics blocks unavailable products", () => {
  const result = calculatePairEconomics(
    { price: 30000, cost: 12000, available: false, lowInventory: false },
    { price: 18000, cost: 7000, available: true, lowInventory: false },
  );
  assert.equal(result.promotable, false);
  assert.equal(result.blockedReason, "UNAVAILABLE");
});

test("pair economics blocks proactive promotion on low inventory", () => {
  const result = calculatePairEconomics(
    { price: 30000, cost: 12000, available: true, lowInventory: true },
    { price: 18000, cost: 7000, available: true, lowInventory: false },
  );
  assert.equal(result.promotable, false);
  assert.equal(result.blockedReason, "LOW_INVENTORY");
});

test("missing costs remain neutral instead of inventing margin", () => {
  const result = calculatePairEconomics(
    { price: 30000, cost: null, available: true, lowInventory: false },
    { price: 18000, cost: 7000, available: true, lowInventory: false },
  );
  assert.equal(result.promotable, true);
  assert.equal(result.costCoverage, "PARTIAL");
  assert.equal(result.contributionMarginPct, null);
  assert.equal(result.profitabilityAdjustment, 0);
});

test("complete pair costs yield contribution margin and bounded adjustment", () => {
  const result = calculatePairEconomics(
    { price: 30000, cost: 12000, available: true, lowInventory: false },
    { price: 18000, cost: 7000, available: true, lowInventory: false },
  );
  assert.equal(result.costCoverage, "COMPLETE");
  assert.equal(result.contribution, 29000);
  assert.ok((result.contributionMarginPct ?? 0) > 60);
  assert.ok(result.profitabilityAdjustment <= 10);
});

test("order contribution requires complete historical cost snapshots", () => {
  const incomplete = calculateOrderContribution([
    { subtotal: 30000, quantity: 1, unitCostSnapshot: 12000 },
    { subtotal: 18000, quantity: 1, unitCostSnapshot: null },
  ]);
  assert.equal(incomplete.costComplete, false);
  assert.equal(incomplete.contribution, null);

  const complete = calculateOrderContribution([
    { subtotal: 30000, quantity: 1, unitCostSnapshot: 12000 },
    { subtotal: 36000, quantity: 2, unitCostSnapshot: 7000 },
  ]);
  assert.equal(complete.costComplete, true);
  assert.equal(complete.revenue, 66000);
  assert.equal(complete.cost, 26000);
  assert.equal(complete.contribution, 40000);
});
