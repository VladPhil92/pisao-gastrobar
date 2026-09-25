import assert from "node:assert/strict";
import test from "node:test";

import { buildContextualCommerceGuidance } from "./contextual-commerce-core";

const products = [
  {
    id: "patacon",
    name: "Patacón Callejero",
    slug: "patacon-callejero",
    category: "patacones-insignia",
    price: 28000,
    cost: 12000,
    available: true,
  },
  {
    id: "beer",
    name: "Golden Pale Ale",
    slug: "golden-pale-ale",
    category: "cervezas",
    price: 18000,
    cost: 7000,
    available: true,
  },
  {
    id: "lemon",
    name: "Limonada de Coco",
    slug: "limonada-coco",
    category: "limonadas",
    price: 14000,
    cost: 9000,
    available: true,
  },
  {
    id: "share",
    name: "Arepitas de la Casa",
    slug: "arepitas-casa",
    category: "entradas",
    price: 12000,
    cost: 5000,
    available: true,
  },
  {
    id: "sweet",
    name: "Postre de la Casa",
    slug: "postre-casa",
    category: "postre",
    price: 16000,
    cost: 6000,
    available: true,
  },
  {
    id: "low",
    name: "Producto Escaso",
    slug: "producto-escaso",
    category: "cervezas",
    price: 22000,
    cost: 4000,
    available: true,
    lowInventory: true,
  },
];

test("does not create proactive commercial action without explicit intent", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Hola, ¿cómo están?",
    lifecycleMode: "LOYALTY",
    favorites: [{ name: "Golden Pale Ale", units: 12 }],
    products,
  });

  assert.equal(result.status, "NO_ACTION");
  assert.equal(result.action, null);
});

test("explicit repeat uses a verified available favorite", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero pedir lo de siempre",
    lifecycleMode: "RETURNING",
    favorites: [
      { name: "Golden Pale Ale", units: 8 },
      { name: "Patacón Callejero", units: 3 },
    ],
    products,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.action?.type, "REPEAT_FAVORITE");
  assert.equal(result.action?.productName, "Golden Pale Ale");
  assert.doesNotMatch(result.context, /costo|rentabilidad|margen/i);
});

test("explicit category intent dominates a more profitable unrelated product", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "¿Qué bebida me recomiendas?",
    lifecycleMode: "FIRST_PURCHASE",
    favorites: [],
    products,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.action?.category, "cervezas");
  assert.notEqual(result.action?.productName, "Postre de la Casa");
});

test("low inventory products are never selected even with strong economics", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Recomiéndame una cerveza",
    lifecycleMode: "ANONYMOUS",
    favorites: [],
    products,
  });

  assert.equal(result.action?.productName, "Golden Pale Ale");
  assert.notEqual(result.action?.productName, "Producto Escaso");
});

test("table completion selects a missing moment and does not duplicate active items", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "¿Qué más le agrego a esto?",
    lifecycleMode: "RETURNING",
    favorites: [],
    products,
    activeProposalProductIds: ["patacon", "beer"],
    activeProposalCategories: ["patacones-insignia", "cervezas"],
  });

  assert.equal(result.status, "READY");
  assert.equal(result.action?.type, "COMPLEMENT_TABLE");
  assert.equal(result.action?.category, "entradas");
  assert.notEqual(result.action?.productId, "patacon");
  assert.notEqual(result.action?.productId, "beer");
});

test("controlled experiment or adaptive policy suppresses V18 intervention", () => {
  const experiment = buildContextualCommerceGuidance({
    latestUserMessage: "¿Qué me recomiendas?",
    lifecycleMode: "RETURNING",
    favorites: [],
    products,
    experimentEligible: true,
  });
  const policy = buildContextualCommerceGuidance({
    latestUserMessage: "¿Qué me recomiendas?",
    lifecycleMode: "RETURNING",
    favorites: [],
    products,
    adaptivePolicyRelevant: true,
  });

  assert.equal(experiment.status, "SUPPRESSED");
  assert.equal(experiment.suppressionReason, "controlled_revenue_layer");
  assert.equal(policy.status, "SUPPRESSED");
  assert.equal(policy.action, null);
});

test("reservation and human-validation intents take precedence over commerce", () => {
  const reservation = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero reservar y recomiéndame algo",
    lifecycleMode: "RETURNING",
    favorites: [],
    products,
    reservationIntent: true,
  });
  const safety = buildContextualCommerceGuidance({
    latestUserMessage: "Soy alérgico al maní, ¿qué me recomiendas?",
    lifecycleMode: "RETURNING",
    favorites: [],
    products,
    requiresHumanValidation: true,
  });

  assert.equal(reservation.suppressionReason, "reservation_priority");
  assert.equal(safety.suppressionReason, "human_validation_required");
});

test("novelty intent does not recycle a known favorite", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero probar algo nuevo, recomiéndame algo",
    lifecycleMode: "LOYALTY",
    favorites: [{ name: "Patacón Callejero", units: 20 }],
    products,
  });

  assert.equal(result.status, "READY");
  assert.notEqual(result.action?.productName, "Patacón Callejero");
  assert.match(result.context, /No agregues productos al carrito/);
  assert.match(result.context, /No inventes descuentos/);
});
