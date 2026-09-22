import { MAX_COMBINED_TABLES } from "@/lib/reservas/policy";

export type ReservableTableDefinition = {
  codigo: string;
  nombre: string;
  capacidad: number;
  zona: string;
  prioridad: number;
  combinable: boolean;
  activa: boolean;
  atributos: string[];
  posX: number;
  posY: number;
};

export type TableCombination = {
  codes: string[];
  totalSeats: number;
  unusedSeats: number;
  priority: number;
  spread: number;
};

export function activeTables(tables: ReservableTableDefinition[]) {
  return tables.filter((table) => table.activa && table.capacidad > 0);
}

export function combinedTableCapacity(tables: ReservableTableDefinition[]) {
  if (tables.length === 0) return 0;
  if (tables.length === 1) return tables[0].capacidad;

  // Regla física PISÁO: cada unión enfrenta dos lados y elimina dos puestos.
  // Con mesas de 4 puestos: 1=4, 2=6, 3=8.
  const nominal = tables.reduce((sum, table) => sum + table.capacidad, 0);
  return Math.max(
    Math.max(...tables.map((table) => table.capacidad)),
    nominal - 2 * (tables.length - 1),
  );
}

export function bestTableCombination(
  tables: ReservableTableDefinition[],
  personas: number,
): TableCombination | null {
  const candidates = activeTables(tables);
  let best: TableCombination | null = null;

  for (let mask = 1; mask < 1 << candidates.length; mask += 1) {
    const subset = candidates.filter((_, index) => (mask & (1 << index)) !== 0);

    // Regla operativa: cualquier mesa reservable disponible puede moverse y
    // combinarse, pero nunca más de tres para una misma reserva.
    if (subset.length > MAX_COMBINED_TABLES) continue;

    const totalSeats = combinedTableCapacity(subset);
    if (totalSeats < personas) continue;

    const unusedSeats = totalSeats - personas;
    const priority = subset.reduce((sum, table) => sum + table.prioridad, 0);
    const xs = subset.map((table) => table.posX);
    const ys = subset.map((table) => table.posY);
    const spread =
      subset.length <= 1
        ? 0
        : Math.max(...xs) -
          Math.min(...xs) +
          Math.max(...ys) -
          Math.min(...ys);
    const codes = subset.map((table) => table.codigo).sort();

    const score = [
      unusedSeats,
      subset.length,
      priority,
      spread,
      codes.join("|"),
    ] as const;

    if (!best) {
      best = { codes, totalSeats, unusedSeats, priority, spread };
      continue;
    }

    const currentScore = [
      best.unusedSeats,
      best.codes.length,
      best.priority,
      best.spread,
      best.codes.join("|"),
    ] as const;

    if (
      score[0] < currentScore[0] ||
      (score[0] === currentScore[0] && score[1] < currentScore[1]) ||
      (score[0] === currentScore[0] &&
        score[1] === currentScore[1] &&
        score[2] < currentScore[2]) ||
      (score[0] === currentScore[0] &&
        score[1] === currentScore[1] &&
        score[2] === currentScore[2] &&
        score[3] < currentScore[3]) ||
      (score[0] === currentScore[0] &&
        score[1] === currentScore[1] &&
        score[2] === currentScore[2] &&
        score[3] === currentScore[3] &&
        score[4] < currentScore[4])
    ) {
      best = { codes, totalSeats, unusedSeats, priority, spread };
    }
  }

  return best;
}
