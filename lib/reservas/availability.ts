import { prisma } from "@/lib/prisma";

const ACTIVE_RESERVATION_STATES = ["PENDIENTE", "CONFIRMADA"] as const;

export type ReservationLoad = {
  hora: string;
  personas: number;
  mesas?: string[];
};

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

export type ReservationSlot = {
  hora: string;
  capacity: number;
  reserved: number;
  remaining: number;
  tablesCapacity: number;
  tablesReserved: number;
  tablesRemaining: number;
};

export type ReservationStartSlot = ReservationSlot & {
  available: boolean;
  tablesNeeded: number;
  recommendedTables: string[];
};

export type ReservationAvailability = {
  available: boolean;
  fecha: string;
  hora: string;
  personas: number;
  capacity: number;
  reserved: number;
  remaining: number;
  tablesCapacity: number;
  tablesReserved: number;
  tablesRemaining: number;
  tablesNeeded: number;
  recommendedTables: string[];
  alternatives: string[];
};

export type ReservationCalendarDay = {
  fecha: string;
  status: "available" | "limited" | "full" | "closed";
  availableSlots: number;
  totalSlots: number;
  bestTime: string | null;
  maxRemaining: number;
  maxTablesRemaining: number;
  slots: ReservationStartSlot[];
};

export type ReservationTableAllocation = {
  available: boolean;
  tablesNeeded: number;
  tablesRemaining: number;
  assignedTables: string[];
  totalSeats: number;
  unusedSeats: number;
};

export type ReservationWindowValidation =
  | { ok: true; startsAt: Date }
  | {
      ok: false;
      error: string;
      code:
        | "INVALID_DATE"
        | "INVALID_TIME"
        | "OUTSIDE_HOURS"
        | "CLOSED"
        | "TOO_SOON"
        | "TOO_FAR";
    };

function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function closedDates() {
  return new Set(
    (process.env.RESERVATION_CLOSED_DATES ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value)),
  );
}

export function getReservationConfig() {
  return {
    slotMinutes: envInt("RESERVATION_SLOT_MINUTES", 30),
    reservationDurationMinutes: envInt("RESERVATION_DURATION_MINUTES", 90),
    maxDinersPerSlot: envInt("RESERVATION_MAX_DINERS_PER_SLOT", 32),
    reservableTableCount: envInt("RESERVATION_TABLE_COUNT", 8),
    seatsPerTable: envInt("RESERVATION_SEATS_PER_TABLE", 4),
    minAdvanceMinutes: envInt("RESERVATION_MIN_ADVANCE_MINUTES", 60),
    maxAdvanceDays: envInt("RESERVATION_MAX_ADVANCE_DAYS", 60),
    calendarDays: Math.min(envInt("RESERVATION_CALENDAR_DAYS", 30), 60),
  };
}

export async function listReservableTables(): Promise<
  ReservableTableDefinition[]
> {
  const tables = await prisma.mesaReservable.findMany({
    orderBy: [{ prioridad: "asc" }, { codigo: "asc" }],
  });
  return tables;
}

function activeTables(tables: ReservableTableDefinition[]) {
  return tables.filter((table) => table.activa && table.capacidad > 0);
}

function parseDate(fecha: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (month < 1 || month > 12 || day < 1 || day > maxDay) return null;
  return { year, month, day };
}

function parseTime(hora: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

function operatingWindow(fecha: string) {
  const parsed = parseDate(fecha);
  if (!parsed || closedDates().has(fecha)) return null;

  const noonBogota = new Date(`${fecha}T12:00:00-05:00`);
  const day = noonBogota.getUTCDay();

  return {
    openMinutes: day >= 1 && day <= 4 ? 16 * 60 : 14 * 60,
    closeMinutes: 22 * 60,
  };
}

function toMinutes(hora: string) {
  const parsed = parseTime(hora);
  return parsed ? parsed.hour * 60 + parsed.minute : null;
}

function formatMinutes(total: number) {
  const hour = Math.floor(total / 60);
  const minute = total % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function addDays(fecha: string, amount: number) {
  const parsed = parseDate(fecha);
  if (!parsed) throw new Error("Fecha inválida");
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  date.setUTCDate(date.getUTCDate() + amount);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function overlaps(horaA: string, horaB: string) {
  const { reservationDurationMinutes } = getReservationConfig();
  const a = toMinutes(horaA);
  const b = toMinutes(horaB);
  if (a === null || b === null) return false;
  return a < b + reservationDurationMinutes && b < a + reservationDurationMinutes;
}

export function bogotaDateString(date = new Date(), addDaysAmount = 0) {
  const shifted = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  shifted.setUTCDate(shifted.getUTCDate() + addDaysAmount);
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function validateReservationWindow(
  fecha: string,
  hora: string,
  now = new Date(),
): ReservationWindowValidation {
  if (!parseDate(fecha)) {
    return { ok: false, error: "La fecha no es válida.", code: "INVALID_DATE" };
  }

  const time = parseTime(hora);
  if (!time) {
    return { ok: false, error: "La hora no es válida.", code: "INVALID_TIME" };
  }

  const config = getReservationConfig();
  const window = operatingWindow(fecha);

  if (!window) {
    return {
      ok: false,
      error: "PISÁO no tiene reservas habilitadas para esa fecha.",
      code: "CLOSED",
    };
  }

  const minutes = time.hour * 60 + time.minute;
  const latestStart = window.closeMinutes - config.reservationDurationMinutes;

  if (
    minutes < window.openMinutes ||
    minutes > latestStart ||
    (minutes - window.openMinutes) % config.slotMinutes !== 0
  ) {
    return {
      ok: false,
      error: `Selecciona una franja válida entre ${formatMinutes(window.openMinutes)} y ${formatMinutes(latestStart)}, en intervalos de ${config.slotMinutes} minutos.`,
      code: "OUTSIDE_HOURS",
    };
  }

  const startsAt = new Date(`${fecha}T${hora}:00-05:00`);
  if (Number.isNaN(startsAt.getTime())) {
    return { ok: false, error: "La fecha u hora no es válida.", code: "INVALID_DATE" };
  }

  const minStart = now.getTime() + config.minAdvanceMinutes * 60_000;
  if (startsAt.getTime() < minStart) {
    return {
      ok: false,
      error: `Las reservas requieren al menos ${config.minAdvanceMinutes} minutos de anticipación.`,
      code: "TOO_SOON",
    };
  }

  const maxStart = now.getTime() + config.maxAdvanceDays * 24 * 60 * 60_000;
  if (startsAt.getTime() > maxStart) {
    return {
      ok: false,
      error: `Solo recibimos reservas con hasta ${config.maxAdvanceDays} días de anticipación.`,
      code: "TOO_FAR",
    };
  }

  return { ok: true, startsAt };
}

function prismaDate(fecha: string) {
  return new Date(`${fecha}T00:00:00.000Z`);
}

export function combinedTableCapacity(
  tables: ReservableTableDefinition[],
) {
  if (tables.length === 0) return 0;
  if (tables.length === 1) return tables[0].capacidad;

  // Cada unión elimina dos puestos: uno en cada cara que queda enfrentada.
  // Con mesas de 4 puestos: 1=4, 2=6, 3=8, 4=10...
  const nominal = tables.reduce((sum, table) => sum + table.capacidad, 0);
  return Math.max(
    Math.max(...tables.map((table) => table.capacidad)),
    nominal - 2 * (tables.length - 1),
  );
}

function bestTableCombination(
  tables: ReservableTableDefinition[],
  personas: number,
) {
  const candidates = activeTables(tables);
  let best:
    | {
        codes: string[];
        totalSeats: number;
        unusedSeats: number;
        priority: number;
        spread: number;
      }
    | null = null;

  for (let mask = 1; mask < 1 << candidates.length; mask += 1) {
    const subset = candidates.filter((_, index) => (mask & (1 << index)) !== 0);
    if (subset.length > 1) {
      if (subset.some((table) => !table.combinable)) continue;
      if (new Set(subset.map((table) => table.zona)).size > 1) continue;
    }

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

function occupiedTablesForWindow(
  reservations: ReservationLoad[],
  hora: string,
  tables: ReservableTableDefinition[],
) {
  const validTables = activeTables(tables);
  const validIds = new Set(validTables.map((table) => table.codigo));
  const overlappingReservations = reservations
    .filter((reservation) => overlaps(reservation.hora, hora))
    .sort((a, b) => a.hora.localeCompare(b.hora));
  const occupied = new Set<string>();

  // Primero respetamos asignaciones persistidas. Las reservas históricas sin
  // mesa se acomodan después sobre el inventario restante, evitando que una
  // estimación legacy "robe" una mesa que ya está asignada explícitamente.
  for (const reservation of overlappingReservations) {
    for (const code of reservation.mesas ?? []) {
      if (validIds.has(code)) occupied.add(code);
    }
  }

  for (const reservation of overlappingReservations) {
    const assigned = (reservation.mesas ?? []).filter((code) =>
      validIds.has(code),
    );
    if (assigned.length > 0) continue;

    const free = validTables.filter((table) => !occupied.has(table.codigo));
    const fallback = bestTableCombination(free, reservation.personas);
    for (const code of fallback?.codes ?? []) occupied.add(code);
  }

  return occupied;
}

export function allocateReservableTables(
  reservations: ReservationLoad[],
  hora: string,
  personas: number,
  tables: ReservableTableDefinition[],
): ReservationTableAllocation {
  const availableTables = activeTables(tables);
  const occupied = occupiedTablesForWindow(reservations, hora, availableTables);
  const free = availableTables.filter((table) => !occupied.has(table.codigo));
  const best = bestTableCombination(free, personas);
  const theoretical = bestTableCombination(availableTables, personas);

  return {
    available: Boolean(best),
    tablesNeeded: best?.codes.length ?? theoretical?.codes.length ?? availableTables.length + 1,
    tablesRemaining: free.length,
    assignedTables: best?.codes ?? [],
    totalSeats: best?.totalSeats ?? 0,
    unusedSeats: best?.unusedSeats ?? 0,
  };
}

function reservationSnapshotForStart(
  fecha: string,
  hora: string,
  personas: number,
  reservations: ReservationLoad[],
  tables: ReservableTableDefinition[],
  now = new Date(),
): ReservationStartSlot | null {
  const validation = validateReservationWindow(fecha, hora, now);
  if (!validation.ok) return null;

  const active = activeTables(tables);
  const occupied = occupiedTablesForWindow(reservations, hora, active);
  const overlappingReservations = reservations.filter((reservation) =>
    overlaps(reservation.hora, hora),
  );
  const reserved = overlappingReservations.reduce(
    (sum, reservation) => sum + reservation.personas,
    0,
  );
  const physicalCapacity = active.reduce(
    (sum, table) => sum + table.capacidad,
    0,
  );
  const capacity = Math.min(getReservationConfig().maxDinersPerSlot, physicalCapacity);
  const allocation = allocateReservableTables(
    reservations,
    hora,
    personas,
    active,
  );

  return {
    hora,
    capacity,
    reserved,
    remaining: Math.max(0, capacity - reserved),
    tablesCapacity: active.length,
    tablesReserved: occupied.size,
    tablesRemaining: Math.max(0, active.length - occupied.size),
    tablesNeeded: allocation.tablesNeeded,
    recommendedTables: allocation.assignedTables,
    available:
      allocation.available && reserved + personas <= capacity,
  };
}

function startTimesForDate(fecha: string) {
  const window = operatingWindow(fecha);
  if (!window) return [];
  const config = getReservationConfig();
  const latestStart = window.closeMinutes - config.reservationDurationMinutes;
  const times: string[] = [];

  for (
    let minute = window.openMinutes;
    minute <= latestStart;
    minute += config.slotMinutes
  ) {
    times.push(formatMinutes(minute));
  }

  return times;
}

function alternativesFor(hora: string, slots: ReservationStartSlot[]) {
  const target = toMinutes(hora) ?? 0;

  return slots
    .filter((entry) => entry.available && entry.hora !== hora)
    .sort((a, b) => {
      const aDistance = Math.abs((toMinutes(a.hora) ?? 0) - target);
      const bDistance = Math.abs((toMinutes(b.hora) ?? 0) - target);
      if (aDistance !== bDistance) return aDistance - bDistance;
      if (b.tablesRemaining !== a.tablesRemaining) {
        return b.tablesRemaining - a.tablesRemaining;
      }
      return b.remaining - a.remaining;
    })
    .slice(0, 4)
    .map((entry) => entry.hora);
}

function occupancySlot(
  hora: string,
  reservations: ReservationLoad[],
  tables: ReservableTableDefinition[],
): ReservationSlot {
  const active = activeTables(tables);
  const occupied = occupiedTablesForWindow(reservations, hora, active);
  const currentMinute = toMinutes(hora) ?? 0;
  const slotMinutes = getReservationConfig().slotMinutes;
  const overlappingReservations = reservations.filter((reservation) => {
    const start = toMinutes(reservation.hora);
    if (start === null) return false;
    const end = start + getReservationConfig().reservationDurationMinutes;
    return start < currentMinute + slotMinutes && end > currentMinute;
  });
  const reserved = overlappingReservations.reduce(
    (sum, reservation) => sum + reservation.personas,
    0,
  );
  const capacity = Math.min(
    getReservationConfig().maxDinersPerSlot,
    active.reduce((sum, table) => sum + table.capacidad, 0),
  );

  return {
    hora,
    capacity,
    reserved,
    remaining: Math.max(0, capacity - reserved),
    tablesCapacity: active.length,
    tablesReserved: occupied.size,
    tablesRemaining: Math.max(0, active.length - occupied.size),
  };
}

export async function listAvailabilityForDate(fecha: string, excludeId?: string) {
  if (!parseDate(fecha)) return [];

  const [reservations, tables] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        fecha: prismaDate(fecha),
        estado: { in: [...ACTIVE_RESERVATION_STATES] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { hora: true, personas: true, mesas: true },
    }),
    listReservableTables(),
  ]);

  const window = operatingWindow(fecha);
  if (!window) return [];

  const slots: ReservationSlot[] = [];
  for (
    let minute = window.openMinutes;
    minute < window.closeMinutes;
    minute += getReservationConfig().slotMinutes
  ) {
    slots.push(occupancySlot(formatMinutes(minute), reservations, tables));
  }
  return slots;
}

export async function listBookableStartsForDate(
  fecha: string,
  personas: number,
  excludeId?: string,
  now = new Date(),
) {
  if (!parseDate(fecha)) return [];

  const [reservations, tables] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        fecha: prismaDate(fecha),
        estado: { in: [...ACTIVE_RESERVATION_STATES] },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { hora: true, personas: true, mesas: true },
    }),
    listReservableTables(),
  ]);

  return startTimesForDate(fecha)
    .map((hora) =>
      reservationSnapshotForStart(
        fecha,
        hora,
        personas,
        reservations,
        tables,
        now,
      ),
    )
    .filter((slot): slot is ReservationStartSlot => Boolean(slot));
}

export async function checkReservationAvailability(params: {
  fecha: string;
  hora: string;
  personas: number;
  excludeId?: string;
}): Promise<ReservationAvailability> {
  const { fecha, hora, personas, excludeId } = params;
  const validation = validateReservationWindow(fecha, hora);

  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const slots = await listBookableStartsForDate(fecha, personas, excludeId);
  const slot = slots.find((entry) => entry.hora === hora);
  if (!slot) {
    throw new Error("La franja solicitada no pertenece al horario de reservas.");
  }

  return {
    available: slot.available,
    fecha,
    hora,
    personas,
    capacity: slot.capacity,
    reserved: slot.reserved,
    remaining: slot.remaining,
    tablesCapacity: slot.tablesCapacity,
    tablesReserved: slot.tablesReserved,
    tablesRemaining: slot.tablesRemaining,
    tablesNeeded: slot.tablesNeeded,
    recommendedTables: slot.recommendedTables,
    alternatives: alternativesFor(hora, slots),
  };
}

export async function listReservationCalendar(params: {
  start?: string;
  days?: number;
  personas: number;
  now?: Date;
}): Promise<ReservationCalendarDay[]> {
  const now = params.now ?? new Date();
  const config = getReservationConfig();
  const start =
    params.start && parseDate(params.start)
      ? params.start
      : bogotaDateString(now);
  const days = Math.min(
    Math.max(params.days ?? config.calendarDays, 1),
    config.calendarDays,
  );
  const endExclusive = addDays(start, days);

  const [reservations, tables] = await Promise.all([
    prisma.reserva.findMany({
      where: {
        fecha: {
          gte: prismaDate(start),
          lt: prismaDate(endExclusive),
        },
        estado: { in: [...ACTIVE_RESERVATION_STATES] },
      },
      select: { fecha: true, hora: true, personas: true, mesas: true },
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    }),
    listReservableTables(),
  ]);

  const grouped = new Map<string, ReservationLoad[]>();
  for (const reservation of reservations) {
    const fecha = reservation.fecha.toISOString().slice(0, 10);
    const current = grouped.get(fecha) ?? [];
    current.push({
      hora: reservation.hora,
      personas: reservation.personas,
      mesas: reservation.mesas,
    });
    grouped.set(fecha, current);
  }

  return Array.from({ length: days }, (_, index) => {
    const fecha = addDays(start, index);
    const dayReservations = grouped.get(fecha) ?? [];
    const slots = startTimesForDate(fecha)
      .map((hora) =>
        reservationSnapshotForStart(
          fecha,
          hora,
          params.personas,
          dayReservations,
          tables,
          now,
        ),
      )
      .filter((slot): slot is ReservationStartSlot => Boolean(slot));
    const available = slots.filter((slot) => slot.available);
    const maxRemaining = available.length
      ? Math.max(...available.map((slot) => slot.remaining))
      : 0;
    const maxTablesRemaining = available.length
      ? Math.max(...available.map((slot) => slot.tablesRemaining))
      : 0;
    const best = [...available].sort((a, b) => {
      const aWaste =
        a.recommendedTables.length > 0
          ? a.recommendedTables.length
          : Number.POSITIVE_INFINITY;
      const bWaste =
        b.recommendedTables.length > 0
          ? b.recommendedTables.length
          : Number.POSITIVE_INFINITY;
      if (aWaste !== bWaste) return aWaste - bWaste;
      if (b.tablesRemaining !== a.tablesRemaining) {
        return b.tablesRemaining - a.tablesRemaining;
      }
      return (toMinutes(a.hora) ?? 0) - (toMinutes(b.hora) ?? 0);
    })[0];

    let status: ReservationCalendarDay["status"] = "available";
    if (!operatingWindow(fecha)) status = "closed";
    else if (!available.length) status = "full";
    else if (available.length <= 3 || maxTablesRemaining <= 1) {
      status = "limited";
    }

    return {
      fecha,
      status,
      availableSlots: available.length,
      totalSlots: slots.length,
      bestTime: best?.hora ?? null,
      maxRemaining,
      maxTablesRemaining,
      slots,
    };
  });
}

export function calculateReservedForStart(
  reservations: ReservationLoad[],
  hora: string,
) {
  const config = getReservationConfig();
  const start = toMinutes(hora);
  if (start === null) return Number.POSITIVE_INFINITY;

  const end = start + config.reservationDurationMinutes;
  return reservations.reduce((sum, reservation) => {
    const existingStart = toMinutes(reservation.hora);
    if (existingStart === null) return sum;
    const existingEnd = existingStart + config.reservationDurationMinutes;
    const overlapping = existingStart < end && existingEnd > start;
    return overlapping ? sum + reservation.personas : sum;
  }, 0);
}
