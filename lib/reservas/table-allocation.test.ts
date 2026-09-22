import assert from "node:assert/strict";
import test from "node:test";
import {
  bestTableCombination,
  combinedTableCapacity,
  type ReservableTableDefinition,
} from "./table-allocation";

function table(
  codigo: string,
  overrides: Partial<ReservableTableDefinition> = {},
): ReservableTableDefinition {
  return {
    codigo,
    nombre: codigo,
    capacidad: 4,
    zona: "Terraza",
    prioridad: Number(codigo.replace(/\D/g, "")) || 1,
    combinable: true,
    activa: true,
    atributos: [],
    posX: Number(codigo.replace(/\D/g, "")) || 0,
    posY: 0,
    ...overrides,
  };
}

const inventory = Array.from({ length: 8 }, (_, index) =>
  table(`T${index + 1}`),
);

test("capacidad física de mesas unidas es 4/6/8", () => {
  assert.equal(combinedTableCapacity([inventory[0]]), 4);
  assert.equal(combinedTableCapacity(inventory.slice(0, 2)), 6);
  assert.equal(combinedTableCapacity(inventory.slice(0, 3)), 8);
});

test("1 a 4 personas usan una sola mesa", () => {
  for (const personas of [1, 2, 3, 4]) {
    assert.equal(bestTableCombination(inventory, personas)?.codes.length, 1);
  }
});

test("5 y 6 personas requieren dos mesas", () => {
  for (const personas of [5, 6]) {
    const best = bestTableCombination(inventory, personas);
    assert.equal(best?.codes.length, 2);
    assert.equal(best?.totalSeats, 6);
  }
});

test("7 y 8 personas requieren tres mesas", () => {
  for (const personas of [7, 8]) {
    const best = bestTableCombination(inventory, personas);
    assert.equal(best?.codes.length, 3);
    assert.equal(best?.totalSeats, 8);
  }
});

test("9 personas nunca reciben cuatro mesas automáticamente", () => {
  assert.equal(bestTableCombination(inventory, 9), null);
});

test("mesas inactivas no participan", () => {
  const tables = inventory.map((entry, index) =>
    index < 2 ? { ...entry, activa: false } : entry,
  );
  const best = bestTableCombination(tables, 4);
  assert.ok(best);
  assert.ok(!best.codes.includes("T1"));
  assert.ok(!best.codes.includes("T2"));
});

test("la zona no bloquea una combinación si las mesas están disponibles", () => {
  const tables = [
    table("T1", { zona: "A", posX: 0 }),
    table("T2", { zona: "B", posX: 1 }),
  ];
  const best = bestTableCombination(tables, 6);
  assert.deepEqual(best?.codes, ["T1", "T2"]);
});

test("la proximidad física desempata combinaciones equivalentes", () => {
  const tables = [
    table("T1", { prioridad: 1, posX: 0 }),
    table("T2", { prioridad: 1, posX: 1 }),
    table("T3", { prioridad: 1, posX: 10 }),
  ];
  const best = bestTableCombination(tables, 6);
  assert.deepEqual(best?.codes, ["T1", "T2"]);
});
