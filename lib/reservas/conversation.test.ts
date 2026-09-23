import assert from "node:assert/strict";
import test from "node:test";
import { analyzeReservationConversation } from "./conversation";

test("un conteo de comensales por sí solo no inicia una reserva", () => {
  const draft = analyzeReservationConversation([
    { role: "user", content: "Somos 4 personas y tenemos $180.000 para compartir" },
  ]);

  assert.equal(draft, null);
});

test("un seguimiento corto conserva la intención de reserva del contexto", () => {
  const draft = analyzeReservationConversation([
    { role: "user", content: "Quiero reservar mañana a las 7 pm" },
    { role: "assistant", content: "¿Para cuántas personas?" },
    { role: "user", content: "4 personas" },
  ]);

  assert.ok(draft);
  assert.equal(draft.personas, 4);
  assert.ok(draft.fecha);
  assert.equal(draft.hora, "19:00");
});
