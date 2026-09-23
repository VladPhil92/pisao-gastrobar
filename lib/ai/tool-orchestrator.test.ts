import assert from "node:assert/strict";
import test from "node:test";
import type { CommerceProduct, ConversationalProposal } from "./conversational-commerce";
import {
  applyCommerceTool,
  hydrateCommerceProposal,
  serializeCommerceProposal,
} from "./tool-orchestrator";

const products: CommerceProduct[] = [
  {
    id: "burger-1",
    nombre: "Hamburguesa Caribe",
    slug: "hamburguesa-caribe",
    precio: 32000,
    disponible: true,
    categoriaSlug: "hamburguesas",
  },
  {
    id: "lemon-1",
    nombre: "Limonada de Coco",
    slug: "limonada-de-coco",
    precio: 12000,
    disponible: true,
    categoriaSlug: "limonadas",
  },
  {
    id: "beer-1",
    nombre: "Golden Pale Ale",
    slug: "golden-pale-ale",
    precio: 18000,
    disponible: true,
    categoriaSlug: "cervezas",
  },
];

const base: ConversationalProposal = {
  id: "base",
  items: [
    {
      product: products[0],
      quantity: 2,
      role: "main",
      roleLabel: "Plato fuerte",
    },
    {
      product: products[1],
      quantity: 2,
      role: "drink",
      roleLabel: "Bebida",
    },
  ],
  diners: 2,
  intent: "rapido",
  intentLabel: "Rápido y contundente",
  drinkPreference: "sin-alcohol",
  targetTotal: 100000,
  total: 88000,
  perPerson: 44000,
  fitsBudget: true,
  budgetWasExplicit: true,
  assumptions: [],
};

test("serializa e hidrata la mesa con precios actuales del catálogo", () => {
  const state = serializeCommerceProposal(base);
  const changedCatalog = products.map((product) =>
    product.id === "burger-1" ? { ...product, precio: 33000 } : product,
  );
  const hydrated = hydrateCommerceProposal(state, changedCatalog);

  assert.ok(hydrated);
  assert.equal(hydrated.total, 90000);
  assert.equal(hydrated.items[0].product.precio, 33000);
});

test("reemplaza una categoría activa por otra conservando cantidades", () => {
  const result = applyCommerceTool({
    latestUserMessage: "Cambia las limonadas por cerveza",
    activeProposal: base,
    products,
  });

  assert.equal(result.handled, true);
  assert.equal(result.tool, "table.replace_item");
  assert.equal(
    result.proposal?.items.find((item) => item.product.id === "beer-1")?.quantity,
    2,
  );
  assert.equal(
    result.proposal?.items.some((item) => item.product.id === "lemon-1"),
    false,
  );
});

test("quita una unidad cuando el usuario usa singular", () => {
  const result = applyCommerceTool({
    latestUserMessage: "Quita una hamburguesa",
    activeProposal: base,
    products,
  });

  assert.equal(result.tool, "table.remove_item");
  assert.equal(
    result.proposal?.items.find((item) => item.product.id === "burger-1")?.quantity,
    1,
  );
});

test("agrega un producto concreto a la mesa existente", () => {
  const result = applyCommerceTool({
    latestUserMessage: "Agrega una cerveza",
    activeProposal: base,
    products,
  });

  assert.equal(result.tool, "table.add_item");
  assert.equal(
    result.proposal?.items.find((item) => item.product.id === "beer-1")?.quantity,
    1,
  );
});

test("no interpreta agregar al carrito como edición de productos", () => {
  const result = applyCommerceTool({
    latestUserMessage: "Agrégalo al carrito",
    activeProposal: base,
    products,
  });

  assert.equal(result.handled, false);
  assert.equal(result.tool, null);
});
