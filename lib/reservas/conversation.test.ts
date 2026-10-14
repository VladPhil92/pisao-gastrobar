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

test("a new menu topic expires a previous reservation draft", () => {
  const draft = analyzeReservationConversation([
    { role: "user", content: "Quiero reservar mañana a las 7 pm" },
    { role: "assistant", content: "¿Para cuántas personas?" },
    { role: "user", content: "Ahora quiero ver las hamburguesas del menú" },
  ]);
  assert.equal(draft, null);
});

test("Mesa Visual and a generic date do not initiate a booking", () => {
  assert.equal(analyzeReservationConversation([
    { role: "user", content: "Muéstrame mi Mesa Visual" },
  ]), null);
  assert.equal(analyzeReservationConversation([
    { role: "user", content: "¿Qué hay en el menú hoy?" },
  ]), null);
});

test("a new booking after a different topic does not reuse old guest data", () => {
  const draft = analyzeReservationConversation([
    { role: "user", content: "Reservar mañana a las 7 pm a nombre de Ana, 4 personas, teléfono 3001234567" },
    { role: "user", content: "¿Qué hamburguesas tienen?" },
    { role: "user", content: "Quiero reservar para 2 el viernes" },
  ]);
  assert.ok(draft);
  assert.equal(draft.personas, 2);
  assert.equal(draft.nombre, undefined);
  assert.equal(draft.telefono, undefined);
});
