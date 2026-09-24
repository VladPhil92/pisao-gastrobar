import assert from "node:assert/strict";
import test from "node:test";
import type {
  CommerceProduct,
  ConversationalProposal,
} from "./conversational-commerce";
import {
  buildNativeToolDefinitions,
  executeNativeToolCall,
  extractNativeToolCalls,
  isExplicitTableMutationIntent,
} from "./native-tools";

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

const activeProposal: ConversationalProposal = {
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

test("solo expone modificación de mesa cuando el usuario la autorizó explícitamente", () => {
  const readOnly = buildNativeToolDefinitions({ allowTableMutation: false });
  const writable = buildNativeToolDefinitions({ allowTableMutation: true });

  assert.equal(
    readOnly.some((tool) => tool.name === "modify_active_table"),
    false,
  );
  assert.equal(
    writable.some((tool) => tool.name === "modify_active_table"),
    true,
  );
  assert.equal(isExplicitTableMutationIntent("Cambia la limonada por cerveza"), true);
  assert.equal(isExplicitTableMutationIntent("¿Qué me recomiendas?"), false);
});

test("extrae solamente function_call válidos y limita el lote", () => {
  const calls = extractNativeToolCalls({
    output: [
      {
        type: "function_call",
        call_id: "call_1",
        name: "get_active_table",
        arguments: "{}",
      },
      { type: "message" },
    ],
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "get_active_table");
});

test("la herramienta nativa puede reemplazar una bebida en la mesa activa", async () => {
  const result = await executeNativeToolCall({
    call: {
      type: "function_call",
      call_id: "call_1",
      name: "modify_active_table",
      arguments: JSON.stringify({
        operation: "replace",
        source: "limonadas",
        target: "cerveza",
        quantity: null,
      }),
    },
    products,
    activeProposal,
    latestUserMessage: "Cambia las limonadas por cerveza",
    checkAvailability: async () => {
      throw new Error("no debería ejecutarse");
    },
  });

  assert.equal(result.commerceMutated, true);
  assert.equal(
    result.commerceProposal?.items.some(
      (item) => item.product.id === "beer-1" && item.quantity === 2,
    ),
    true,
  );
});

test("rechaza una mutación pedida por el modelo sin autorización del último mensaje", async () => {
  const result = await executeNativeToolCall({
    call: {
      type: "function_call",
      call_id: "call_2",
      name: "modify_active_table",
      arguments: JSON.stringify({
        operation: "add",
        source: null,
        target: "cerveza",
        quantity: 1,
      }),
    },
    products,
    activeProposal,
    latestUserMessage: "¿Qué me recomiendas?",
    checkAvailability: async () => {
      throw new Error("no debería ejecutarse");
    },
  });

  assert.equal(result.commerceMutated, undefined);
  assert.match(result.output.output, /USER_AUTHORIZATION_REQUIRED/);
});

test("consulta disponibilidad mediante una función inyectada", async () => {
  const result = await executeNativeToolCall({
    call: {
      type: "function_call",
      call_id: "call_3",
      name: "check_reservation_availability",
      arguments: JSON.stringify({
        fecha: "2026-09-25",
        hora: "19:00",
        personas: 4,
      }),
    },
    products,
    activeProposal,
    latestUserMessage: "¿Hay mesa para 4 el 25 a las 7?",
    checkAvailability: async (params) => ({
      available: true,
      fecha: params.fecha,
      hora: params.hora,
      personas: params.personas,
      capacity: 40,
      reserved: 8,
      remaining: 32,
      tablesCapacity: 10,
      tablesReserved: 2,
      tablesRemaining: 8,
      tablesNeeded: 1,
      recommendedTables: ["T1"],
      alternatives: [],
    }),
  });

  assert.match(result.output.output, /"available":true/);
});


test("verifica un pedido sin exponer PII", async () => {
  const result = await executeNativeToolCall({
    call: {
      type: "function_call",
      call_id: "call_order",
      name: "get_order_status",
      arguments: JSON.stringify({
        numero: 321,
        telefono: "3186428218",
      }),
    },
    products,
    activeProposal,
    latestUserMessage: "¿Cómo va mi pedido 321? Mi teléfono es 3186428218",
    checkAvailability: async () => {
      throw new Error("no debería ejecutarse");
    },
    lookupOrderStatus: async ({ numero, telefono }) => {
      assert.equal(numero, 321);
      assert.equal(telefono, "3186428218");
      return {
        stage: { code: "PREPARING", label: "En preparación" },
        payment: { estado: "APROBADO" },
      };
    },
  });

  assert.match(result.output.output, /"PREPARING"/);
  assert.doesNotMatch(result.output.output, /clienteNombre|clienteEmail|direccion/);
});
