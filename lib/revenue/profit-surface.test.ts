import assert from "node:assert/strict";
import test from "node:test";
import { getTableSuggestions } from "@/lib/cart/experience";
import { rankAdaptiveMenu } from "@/lib/menu/adaptive-engine";
import { buildPlanProposal } from "@/lib/menu/plan-mode";

const normal = {
  id: "normal",
  nombre: "Patacón Costeño",
  slug: "patacon-costeno",
  precio: 32000,
  disponible: true,
  inventarioBajo: false,
  categoriaSlug: "patacones-insignia",
};

const low = {
  id: "low",
  nombre: "Patacón Callejero",
  slug: "patacon-callejero",
  precio: 34000,
  disponible: true,
  inventarioBajo: true,
  categoriaSlug: "patacones-insignia",
};

const drink = {
  id: "drink",
  nombre: "Limonada",
  slug: "limonada",
  precio: 16000,
  disponible: true,
  inventarioBajo: false,
  categoriaSlug: "limonadas",
};

test("low inventory remains visible but loses adaptive discovery priority", () => {
  const ranked = rankAdaptiveMenu(
    [low, normal],
    [],
    null,
    new Date("2026-09-23T18:00:00-05:00"),
  ).ranked;

  assert.equal(ranked.length, 2);
  assert.equal(ranked[0].product.id, "normal");
  assert.ok(ranked.some((entry) => entry.product.id === "low"));
});

test("low inventory is excluded from proactive table suggestions", () => {
  const suggestions = getTableSuggestions([low, normal, drink], []);
  assert.equal(suggestions.some((product) => product.id === "low"), false);
  assert.equal(suggestions.some((product) => product.id === "normal"), true);
});

test("Plan Mode excludes low inventory while keeping normal products eligible", () => {
  const proposal = buildPlanProposal([low, normal, drink], {
    intent: "rapido",
    diners: 1,
    budgetPerPerson: 60000,
    drinkPreference: "sin-alcohol",
  });

  assert.equal(
    proposal.items.some((item) => item.product.id === "low"),
    false,
  );
  assert.equal(
    proposal.items.some((item) => item.product.id === "normal"),
    true,
  );
});
