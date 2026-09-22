import { prisma } from "@/lib/prisma";

const ACTIVE_RESERVATION_STATES = ["PENDIENTE", "CONFIRMADA"] as const;

type ReservationLoad = {
  hora: string;
  personas: number;
};

export type ReservationSlot = {
  hora: string;
  capacity: number;
  reserved: number;
  remaining: number;
};

export type ReservationStartSlot = ReservationSlot & {
  available: boolean;
};

export type ReservationAvailability = {
  available: boolean;
  fecha: string;
  hora: string;
  personas: number;
  capacity: number;
  reserved: number;
  remaining: number;
  alternatives: string[];
};

export type ReservationCalendarDay = {
  fecha: string;
  status: "available" | "limited" | "full" | "closed";
  availableSlots: number;
  totalSlots: number;
  bestTime: string | null;
  maxRemaining: number;
  slots: ReservationStartSlot[];
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
    maxDinersPerSlot: envInt("RESERVATION_MAX_DINERS_PER_SLOT", 40),
    minAdvanceMinutes: envInt("RESERVATION_MIN_ADVANCE_MINUTES", 60),
    maxAdvanceDays: envInt("RESERVATION_MAX_ADVANCE_DAYS", 60),
    calendarDays: Math.min(envInt("RESERVATION_CALENDAR_DAYS", 30), 60),
  };
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

function buildOccupancySlots(
  fecha: string,
  reservations: ReservationLoad[],
): ReservationSlot[] {
  const window = operatingWindow(fecha);
  if (!window) return [];

  const config = getReservationConfig();
  const slots: ReservationSlot[] = [];

  for (
    let minute = window.openMinutes;
    minute < window.closeMinutes;
    minute += config.slotMinutes
  ) {
    const slotEnd = minute + config.slotMinutes;
    const reserved = reservations.reduce((sum, reservation) => {
      const starts = toMinutes(reservation.hora);
      if (starts === null) return sum;
      const ends = starts + config.reservationDurationMinutes;
      const overlaps = starts < slotEnd && ends > minute;
      return overlaps ? sum + reservation.personas : sum;
    }, 0);

    slots.push({
      hora: formatMinutes(minute),
      capacity: config.maxDinersPerSlot,
      reserved,
      remaining: Math.max(0, config.maxDinersPerSlot - reserved),
    });
  }

  return slots;
}

function capacityForStart(
  fecha: string,
  hora: string,
  occupancy: ReservationSlot[],
  now = new Date(),
) {
  const validation = validateReservationWindow(fecha, hora, now);
  if (!validation.ok) return null;

  const config = getReservationConfig();
  const start = toMinutes(hora);
  if (start === null) return null;

  const affected = occupancy.filter((slot) => {
    const slotStart = toMinutes(slot.hora);
    return (
      slotStart !== null &&
      slotStart >= start &&
      slotStart < start + config.reservationDurationMinutes
    );
  });

  if (!affected.length) return null;

  const remaining = Math.min(...affected.map((slot) => slot.remaining));
  const reserved = Math.max(...affected.map((slot) => slot.reserved));

  return {
    hora,
    capacity: config.maxDinersPerSlot,
    reserved,
    remaining,
  };
}

function startSlotsFromOccupancy(
  fecha: string,
  occupancy: ReservationSlot[],
  personas: number,
  now = new Date(),
): ReservationStartSlot[] {
  return occupancy
    .map((slot) => capacityForStart(fecha, slot.hora, occupancy, now))
    .filter(
      (
        slot,
      ): slot is {
        hora: string;
        capacity: number;
        reserved: number;
        remaining: number;
      } => Boolean(slot),
    )
    .map((slot) => ({
      ...slot,
      available: slot.remaining >= personas,
    }));
}

function alternativesFor(
  hora: string,
  slots: ReservationStartSlot[],
  personas: number,
) {
  const target = toMinutes(hora) ?? 0;

  return slots
    .filter((entry) => entry.available && entry.remaining >= personas && entry.hora !== hora)
    .sort((a, b) => {
      const aDistance = Math.abs((toMinutes(a.hora) ?? 0) - target);
      const bDistance = Math.abs((toMinutes(b.hora) ?? 0) - target);
      if (aDistance !== bDistance) return aDistance - bDistance;
      return b.remaining - a.remaining;
    })
    .slice(0, 4)
    .map((entry) => entry.hora);
}

export async function listAvailabilityForDate(fecha: string, excludeId?: string) {
  if (!parseDate(fecha)) return [];

  const reservations = await prisma.reserva.findMany({
    where: {
      fecha: prismaDate(fecha),
      estado: { in: [...ACTIVE_RESERVATION_STATES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { hora: true, personas: true },
  });

  return buildOccupancySlots(fecha, reservations);
}

export async function listBookableStartsForDate(
  fecha: string,
  personas: number,
  excludeId?: string,
  now = new Date(),
) {
  const occupancy = await listAvailabilityForDate(fecha, excludeId);
  return startSlotsFromOccupancy(fecha, occupancy, personas, now);
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
    alternatives: alternativesFor(hora, slots, personas),
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
  const start = params.start && parseDate(params.start) ? params.start : bogotaDateString(now);
  const days = Math.min(Math.max(params.days ?? config.calendarDays, 1), config.calendarDays);
  const endExclusive = addDays(start, days);

  const reservations = await prisma.reserva.findMany({
    where: {
      fecha: {
        gte: prismaDate(start),
        lt: prismaDate(endExclusive),
      },
      estado: { in: [...ACTIVE_RESERVATION_STATES] },
    },
    select: { fecha: true, hora: true, personas: true },
    orderBy: [{ fecha: "asc" }, { hora: "asc" }],
  });

  const grouped = new Map<string, ReservationLoad[]>();
  for (const reservation of reservations) {
    const fecha = reservation.fecha.toISOString().slice(0, 10);
    const current = grouped.get(fecha) ?? [];
    current.push({ hora: reservation.hora, personas: reservation.personas });
    grouped.set(fecha, current);
  }

  return Array.from({ length: days }, (_, index) => {
    const fecha = addDays(start, index);
    const occupancy = buildOccupancySlots(fecha, grouped.get(fecha) ?? []);
    const slots = startSlotsFromOccupancy(fecha, occupancy, params.personas, now);
    const available = slots.filter((slot) => slot.available);
    const maxRemaining = available.length
      ? Math.max(...available.map((slot) => slot.remaining))
      : 0;
    const best = [...available].sort((a, b) => {
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      return (toMinutes(a.hora) ?? 0) - (toMinutes(b.hora) ?? 0);
    })[0];

    let status: ReservationCalendarDay["status"] = "available";
    if (!operatingWindow(fecha)) status = "closed";
    else if (!available.length) status = "full";
    else if (
      available.length <= 3 ||
      maxRemaining < Math.ceil(config.maxDinersPerSlot * 0.35)
    ) {
      status = "limited";
    }

    return {
      fecha,
      status,
      availableSlots: available.length,
      totalSlots: slots.length,
      bestTime: best?.hora ?? null,
      maxRemaining,
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
    const overlaps = existingStart < end && existingEnd > start;
    return overlaps ? sum + reservation.personas : sum;
  }, 0);
}
