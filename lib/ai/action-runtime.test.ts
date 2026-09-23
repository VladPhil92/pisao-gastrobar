import assert from "node:assert/strict";
import test from "node:test";
import { buildConciergeAction } from "./action-runtime";

const proposal = {
  id: "share:4:180000:callejerox2",
  items: [],
  diners: 4,
  intent: "compartir" as const,
  intentLabel: "Para compartir",
  drinkPreference: "sin-alcohol" as const,
  targetTotal: 180000,
  total: 170000,
  perPerson: 42500,
  fitsBudget: true,
  budgetWasExplicit: true,
  assumptions: [],
};

const reservation = {
  draft: {
    nombre: "Ana",
    telefono: "3001234567",
    fecha: "2026-09-25",
    hora: "19:00",
    personas: 4,
    missing: [],
    ready: true,
  },
  availability: null,
  availabilityError: null,
  canSubmit: true,
};

test("autoriza agregar propuesta solo con orden explícita", () => {
  const action = buildConciergeAction({
    latestUserMessage: "Agrégalo al carrito",
    proposal,
    reservation: null,
  });

  assert.equal(action?.type, "cart.add_proposal");
  assert.equal(action?.execution, "client_auto");
});

test("no agrega al carrito por una respuesta ambigua", () => {
  const action = buildConciergeAction({
    latestUserMessage: "Dale, se ve bien",
    proposal,
    reservation: null,
  });

  assert.equal(action, null);
});

test("autoriza confirmación de reserva cuando la solicitud está lista", () => {
  const action = buildConciergeAction({
    latestUserMessage: "Confirma la reserva",
    proposal: null,
    reservation,
  });

  assert.equal(action?.type, "reservation.confirm");
  assert.equal(action?.execution, "client_auto");
});

test("no confirma una reserva incompleta", () => {
  const action = buildConciergeAction({
    latestUserMessage: "Confirma la reserva",
    proposal: null,
    reservation: { ...reservation, canSubmit: false },
  });

  assert.equal(action, null);
});

test("prioriza handoff para alergias o coordinación especial", () => {
  const action = buildConciergeAction({
    latestUserMessage: "Queremos comer",
    proposal,
    reservation: null,
    requiresHumanValidation: true,
  });

  assert.equal(action?.type, "human.handoff");
  assert.equal(action?.execution, "user_tap");
});
