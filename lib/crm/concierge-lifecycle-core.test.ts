import assert from "node:assert/strict";
import test from "node:test";

import {
  CONCIERGE_LIFECYCLE_VERSION,
  buildConciergeLifecycleGuidance,
} from "./concierge-lifecycle-core";

test("anonymous sessions receive no historical assumptions", () => {
  const result = buildConciergeLifecycleGuidance({
    authenticated: false,
    stage: "PROSPECT",
    deliveredOrders: 0,
    loyaltyPoints: 0,
    favorites: [],
  });

  assert.equal(result.mode, "ANONYMOUS");
  assert.equal(result.signals.authenticated, false);
  assert.deepEqual(result.signals.favorites, []);
  assert.match(result.context, /No hay una cuenta PISÁO autenticada/);
  assert.doesNotMatch(result.context, /Favoritos históricos verificables:/);
});

test("returning customers can use verified historical favorites without promises", () => {
  const result = buildConciergeLifecycleGuidance({
    authenticated: true,
    stage: "ACTIVE",
    deliveredOrders: 4,
    loyaltyPoints: 280,
    favorites: [
      { name: "Patacón Callejero", units: 5 },
      { name: "Golden Pale Ale", units: 3 },
    ],
  });

  assert.equal(result.version, CONCIERGE_LIFECYCLE_VERSION);
  assert.equal(result.mode, "RETURNING");
  assert.equal(result.signals.authenticated, true);
  assert.deepEqual(result.signals.favorites[0], {
    name: "Patacón Callejero",
    units: 5,
  });
  assert.match(result.context, /Patacón Callejero/);
  assert.match(result.context, /Golden Pale Ale/);
  assert.match(result.context, /canje automático NO está habilitado/);
  assert.match(result.context, /verifica que aparezca disponible/);
});

test("loyalty context never turns points into an entitlement", () => {
  const result = buildConciergeLifecycleGuidance({
    authenticated: true,
    stage: "LOYAL",
    deliveredOrders: 9,
    loyaltyPoints: 1400,
    favorites: [{ name: "Irish Red Ale", units: 7 }],
  });

  assert.equal(result.mode, "LOYALTY");
  assert.match(result.context, /nunca prometas beneficios no configurados/);
  assert.match(result.context, /No inventes descuentos, regalos, privilegios/);
});

test("at-risk and dormant stages are hidden from guest-facing model behavior", () => {
  for (const stage of ["AT_RISK", "DORMANT"] as const) {
    const result = buildConciergeLifecycleGuidance({
      authenticated: true,
      stage,
      deliveredOrders: 3,
      loyaltyPoints: 210,
      favorites: [{ name: "Porter", units: 2 }],
    });

    assert.equal(result.mode, "RETURN_RECOVERY");
    assert.match(result.context, /no menciones inactividad, riesgo, dormancia/);
    assert.match(result.context, /no autoriza contacto saliente/);
  }
});

test("favorite context is bounded and sanitizes invalid counts", () => {
  const result = buildConciergeLifecycleGuidance({
    authenticated: true,
    stage: "ACTIVE",
    deliveredOrders: 3.8,
    loyaltyPoints: Number.NaN,
    favorites: [
      { name: "A", units: 1 },
      { name: "B", units: 8 },
      { name: "C", units: 4 },
      { name: "D", units: 3 },
      { name: "E", units: 2 },
      { name: "Invalid", units: -10 },
    ],
  });

  assert.match(result.context, /Pedidos pagados y entregados verificados: 3/);
  assert.match(result.context, /Saldo PISÁO Points: 0/);
  assert.match(result.context, /B \(8 uds\.\)/);
  assert.doesNotMatch(result.context, /Invalid/);
  assert.doesNotMatch(result.context, /A \(1 uds\.\).*E \(2 uds\.\)/);
});
