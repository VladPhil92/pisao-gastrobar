import assert from "node:assert/strict";
import test from "node:test";
import { buildPisaoInstructions, routePisaoAgent } from "./pisao-agents";

test("commercial group sizes do not trigger the reservation specialist", () => {
  assert.equal(routePisaoAgent("Somos 4 personas y queremos comer").id, "ventas");
  assert.equal(routePisaoAgent("¿Cómo va mi Mesa Visual?").id, "anfitrion");
  assert.equal(routePisaoAgent("Quiero reservar una mesa para 4").id, "reservas");
});

test("prompt prioritizes verified facts and natural direct replies", () => {
  const prompt = buildPisaoInstructions({
    agent: routePisaoAgent("¿Cuál es el menú?"),
    menuContext: "CATÁLOGO NO VERIFICABLE",
    hoursContext: "Mall Plaza Cartagena",
  });
  assert.match(prompt, /catálogo dinámico de Prisma/);
  assert.match(prompt, /cambia de tema/);
  assert.match(prompt, /Responde primero a la pregunta concreta/);
});
