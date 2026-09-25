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
  assert.doesNotMatch(
    result.context,
    /\$7\.000|margen\s*[:=]\s*\d|rentabilidad\s*[:=]\s*\d|costo\s*[:=]\s*\d/i,
  );
});

test("generic beverage intent defaults to non-alcoholic options", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "¿Qué bebida me recomiendas?",
    lifecycleMode: "FIRST_PURCHASE",
    favorites: [],
    products,
    drinkPreference: "sin-alcohol",
  });

  assert.equal(result.status, "READY");
  assert.equal(result.action?.category, "limonadas");
  assert.notEqual(result.action?.productName, "Golden Pale Ale");
});

test("explicit beer intent may select beer but still respects inventory", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Recomiéndame una cerveza",
    lifecycleMode: "FIRST_PURCHASE",
    favorites: [],
    products,
    drinkPreference: "cerveza",
  });

  assert.equal(result.action?.productName, "Golden Pale Ale");
  assert.notEqual(result.action?.productName, "Producto Escaso");
});

test("anonymous repeat intent does not guess prior orders", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero lo de siempre",
    lifecycleMode: "ANONYMOUS",
    favorites: [],
    products,
  });

  assert.equal(result.status, "NO_ACTION");
  assert.equal(result.action, null);
  assert.match(result.context, /no existe un favorito histórico verificable/i);
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


test("explicit budget prevents out-of-budget suggestion", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Recomiéndame algo nuevo",
    lifecycleMode: "FIRST_PURCHASE",
    favorites: [],
    products,
    maxSuggestedUnitPrice: 15000,
  });

  assert.equal(result.status, "READY");
  assert.ok((result.action?.currentPrice ?? Infinity) <= 15000);
});

test("existing calculated proposal blocks generic extra upsell", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Recomiéndame algo",
    lifecycleMode: "RETURNING",
    favorites: [],
    products,
    activeProposalProductIds: ["patacon", "beer"],
    activeProposalCategories: ["patacones-insignia", "cervezas"],
  });

  assert.equal(result.status, "NO_ACTION");
  assert.match(result.context, /ya existe una propuesta calculada/i);
});

test("dietary constraints filter contextual candidates", () => {
  const constrainedProducts = [
    ...products,
    {
      id: "spicy",
      name: "Patacón Jalapeño",
      slug: "patacon-jalapeno",
      description: "Con carne y jalapeño picante",
      category: "patacones-insignia",
      price: 13000,
      cost: 3000,
      available: true,
    },
  ];

  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero algo nuevo y sin picante",
    lifecycleMode: "FIRST_PURCHASE",
    favorites: [],
    products: constrainedProducts,
    noSpicy: true,
    maxSuggestedUnitPrice: 15000,
  });

  assert.equal(result.status, "READY");
  assert.notEqual(result.action?.productId, "spicy");
});


test("profitability is only a tie-breaker and cannot override explicit category intent", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero un postre, ¿cuál me recomiendas?",
    lifecycleMode: "LOYALTY",
    favorites: [{ name: "Golden Pale Ale", units: 50 }],
    products,
  });

  assert.equal(result.status, "READY");
  assert.equal(result.action?.category, "postre");
  assert.equal(result.action?.productName, "Postre de la Casa");
});


test("mature closed-loop evidence can break a tie between equally eligible products", () => {
  const alternatives = [
    {
      id: "lemon-a",
      name: "Limonada A",
      slug: "limonada-a",
      category: "limonadas",
      price: 14000,
      cost: 7000,
      available: true,
    },
    {
      id: "lemon-b",
      name: "Limonada B",
      slug: "limonada-b",
      category: "limonadas",
      price: 14000,
      cost: 7000,
      available: true,
    },
  ];

  const result = buildContextualCommerceGuidance({
    latestUserMessage: "¿Qué bebida me recomiendas?",
    lifecycleMode: "FIRST_PURCHASE",
    favorites: [],
    products: alternatives,
    drinkPreference: "sin-alcohol",
    learningSignals: [
      {
        productSlug: "limonada-a",
        exposures: 40,
        accepted: 4,
        addRatePct: 10,
        matchedPaidOrders: 1,
        paidMatchRatePct: 3,
      },
      {
        productSlug: "limonada-b",
        exposures: 40,
        accepted: 18,
        addRatePct: 45,
        matchedPaidOrders: 8,
        paidMatchRatePct: 20,
      },
    ],
  });

  assert.equal(result.status, "READY");
  assert.equal(result.action?.productSlug, "limonada-b");
  assert.equal(result.action?.learning.applied, true);
  assert.ok((result.action?.learning.adjustment ?? 0) > 0);
});

test("closed-loop evidence below sample floor cannot change deterministic ordering", () => {
  const alternatives = [
    {
      id: "a",
      name: "Entrada A",
      slug: "entrada-a",
      category: "entradas",
      price: 12000,
      cost: 5000,
      available: true,
    },
    {
      id: "b",
      name: "Entrada B",
      slug: "entrada-b",
      category: "entradas",
      price: 12000,
      cost: 5000,
      available: true,
    },
  ];

  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero una entrada para compartir",
    lifecycleMode: "FIRST_PURCHASE",
    favorites: [],
    products: alternatives,
    learningSignals: [
      {
        productSlug: "entrada-b",
        exposures: 11,
        accepted: 11,
        addRatePct: 100,
        matchedPaidOrders: 11,
        paidMatchRatePct: 100,
      },
    ],
  });

  assert.equal(result.action?.productSlug, "entrada-a");
  assert.equal(result.action?.learning.applied, false);
});

test("closed-loop learning never revives unavailable or low-inventory products", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Recomiéndame una cerveza",
    lifecycleMode: "FIRST_PURCHASE",
    favorites: [],
    products,
    drinkPreference: "cerveza",
    learningSignals: [
      {
        productSlug: "producto-escaso",
        exposures: 100,
        accepted: 90,
        addRatePct: 90,
        matchedPaidOrders: 80,
        paidMatchRatePct: 80,
      },
    ],
  });

  assert.notEqual(result.action?.productSlug, "producto-escaso");
});

test("explicit repeat ignores aggregate closed-loop learning", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero lo de siempre",
    lifecycleMode: "RETURNING",
    favorites: [
      { name: "Golden Pale Ale", units: 8 },
      { name: "Patacón Callejero", units: 3 },
    ],
    products,
    learningSignals: [
      {
        productSlug: "patacon-callejero",
        exposures: 100,
        accepted: 90,
        addRatePct: 90,
        matchedPaidOrders: 80,
        paidMatchRatePct: 80,
      },
    ],
  });

  assert.equal(result.action?.productName, "Golden Pale Ale");
  assert.equal(result.action?.learning.applied, false);
  assert.equal(result.action?.learning.adjustment, 0);
});

test("explicit category remains a hard filter regardless of learned evidence", () => {
  const result = buildContextualCommerceGuidance({
    latestUserMessage: "Quiero un postre, ¿cuál me recomiendas?",
    lifecycleMode: "RETURNING",
    favorites: [],
    products,
    learningSignals: [
      {
        productSlug: "golden-pale-ale",
        exposures: 100,
        accepted: 95,
        addRatePct: 95,
        matchedPaidOrders: 90,
        paidMatchRatePct: 90,
      },
    ],
  });

  assert.equal(result.action?.category, "postre");
  assert.equal(result.action?.productSlug, "postre-casa");
});
