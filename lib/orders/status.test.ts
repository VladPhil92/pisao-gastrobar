import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransitionOrderStatus,
  nextOperationalStatuses,
  orderStatusActionLabel,
} from "./status";

test("pickup orders progress from confirmed to delivered without on-route", () => {
  assert.deepEqual(nextOperationalStatuses("CONFIRMADO", "RECOGIDA"), [
    "EN_PREPARACION",
  ]);
  assert.deepEqual(nextOperationalStatuses("EN_PREPARACION", "RECOGIDA"), [
    "LISTO",
  ]);
  assert.deepEqual(nextOperationalStatuses("LISTO", "RECOGIDA"), ["ENTREGADO"]);
});

test("delivery orders require an on-route stage before delivered", () => {
  assert.deepEqual(nextOperationalStatuses("LISTO", "DOMICILIO"), ["EN_CAMINO"]);
  assert.deepEqual(nextOperationalStatuses("EN_CAMINO", "DOMICILIO"), [
    "ENTREGADO",
  ]);
  assert.equal(
    canTransitionOrderStatus({
      current: "LISTO",
      next: "ENTREGADO",
      deliveryType: "DOMICILIO",
    }),
    false,
  );
});

test("payment states cannot be bypassed through operational controls", () => {
  assert.deepEqual(
    nextOperationalStatuses("PENDIENTE_VERIFICACION", "RECOGIDA"),
    [],
  );
  assert.equal(
    canTransitionOrderStatus({
      current: "PENDIENTE_VERIFICACION",
      next: "EN_PREPARACION",
      deliveryType: "RECOGIDA",
    }),
    false,
  );
});

test("admin action labels follow the delivery mode", () => {
  assert.equal(
    orderStatusActionLabel("LISTO", "DOMICILIO")?.label,
    "Marcar en camino",
  );
  assert.equal(
    orderStatusActionLabel("LISTO", "RECOGIDA")?.label,
    "Marcar entregado",
  );
});
