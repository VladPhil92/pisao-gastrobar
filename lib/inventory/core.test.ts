import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateDaysOfCover,
  calculateRecipeCost,
  calculateRecipeInventoryRisk,
  calculateUnitCostFromPurchase,
  effectiveRecipeQuantity,
} from "./core";

test("waste increases effective recipe consumption", () => {
  assert.equal(effectiveRecipeQuantity(100, 10), 110);
});

test("recipe cost refuses to invent missing ingredient costs", () => {
  const result = calculateRecipeCost([
    {
      ingredientId: "plantain",
      quantityBase: 200,
      wastePct: 10,
      unitCost: 8,
      stock: 5000,
      minimumStock: 1000,
      active: true,
    },
    {
      ingredientId: "cheese",
      quantityBase: 30,
      wastePct: 0,
      unitCost: null,
      stock: 1000,
      minimumStock: 200,
      active: true,
    },
  ]);

  assert.equal(result.complete, false);
  assert.equal(result.configuredLines, 1);
  assert.equal(result.partialCost, 1760);
  assert.equal(result.theoreticalCost, null);
});

test("complete recipe returns theoretical cost", () => {
  const result = calculateRecipeCost([
    {
      ingredientId: "plantain",
      quantityBase: 200,
      wastePct: 10,
      unitCost: 8,
      stock: 5000,
      minimumStock: 1000,
      active: true,
    },
    {
      ingredientId: "cheese",
      quantityBase: 30,
      wastePct: 0,
      unitCost: 20,
      stock: 1000,
      minimumStock: 200,
      active: true,
    },
  ]);

  assert.equal(result.complete, true);
  assert.equal(result.theoreticalCost, 2360);
});

test("recipe inventory risk identifies limiting portions and low stock", () => {
  const risk = calculateRecipeInventoryRisk([
    {
      ingredientId: "plantain",
      quantityBase: 200,
      wastePct: 0,
      unitCost: 8,
      stock: 900,
      minimumStock: 1000,
      active: true,
    },
    {
      ingredientId: "cheese",
      quantityBase: 30,
      wastePct: 0,
      unitCost: 20,
      stock: 1000,
      minimumStock: 200,
      active: true,
    },
  ]);

  assert.equal(risk.configured, true);
  assert.equal(risk.low, true);
  assert.equal(risk.blocked, false);
  assert.equal(risk.estimatedPortions, 4);
  assert.equal(risk.criticalIngredientId, "plantain");
});

test("zero stock blocks recipe availability", () => {
  const risk = calculateRecipeInventoryRisk([
    {
      ingredientId: "plantain",
      quantityBase: 200,
      wastePct: 0,
      unitCost: 8,
      stock: 0,
      minimumStock: 1000,
      active: true,
    },
  ]);

  assert.equal(risk.blocked, true);
  assert.equal(risk.low, true);
  assert.equal(risk.estimatedPortions, 0);
});

test("purchase package derives unit cost without hidden conversion", () => {
  assert.equal(calculateUnitCostFromPurchase(12000, 1000), 12);
  assert.equal(calculateUnitCostFromPurchase(12000, 0), null);
});

test("days of cover stays unknown without observed demand", () => {
  assert.equal(calculateDaysOfCover(1000, 0), null);
  assert.equal(calculateDaysOfCover(1000, 250), 4);
});
