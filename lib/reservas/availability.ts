import { prisma } from "@/lib/prisma";

const ACTIVE_RESERVATION_STATES = ["PENDIENTE", "CONFIRMADA"] as const;

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

export type ReservationWindowValidation =
  | { ok: true; startsAt: Date }
  | { ok: false; error: string; code: "INVALID_DATE" | "INVALID_TIME" | "OUTSIDE_HOURS" | "TOO_SOON" | "TOO_FAR" };

function envInt(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

export function getReservationConfig() {
  return {
    slotMinutes: envInt("RESERVATION_SLOT_MINUTES", 30),
    maxDinersPerSlot: envInt("RESERVATION_MAX_DINERS_PER_SLOT", 40),
    minAdvanceMinutes: envInt("RESERVATION_MIN_ADVANCE_MINUTES", 60),
    maxAdvanceDays: envInt("RESERVATION_MAX_ADVANCE_DAYS", 60),
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
  if (!parsed) return null;

  // El mediodía local evita saltos de día al calcular el weekday desde UTC.
  const noonBogota = new Date(
    `${fecha}T12:00:00-05:00`,
  );
  const day = noonBogota.getUTCDay();

  // Lunes-jueves: 16:00-22:00. Viernes-domingo: 14:00-22:00.
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

export function bogotaDateString(date = new Date(), addDays = 0) {
  const shifted = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  shifted.setUTCDate(shifted.getUTCDate() + addDays);
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
  const minutes = time.hour * 60 + time.minute;

  if (
    !window ||
    minutes < window.openMinutes ||
    minutes > window.closeMinutes - config.slotMinutes ||
    (minutes - window.openMinutes) % config.slotMinutes !== 0
  ) {
    const open = window ? formatMinutes(window.openMinutes) : "14:00";
    const close = window ? formatMinutes(window.closeMinutes) : "22:00";
    return {
      ok: false,
      error: `Selecciona una franja válida entre ${open} y ${close}, en intervalos de ${config.slotMinutes} minutos.`,
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

export async function listAvailabilityForDate(fecha: string, excludeId?: string) {
  const parsed = parseDate(fecha);
  const window = operatingWindow(fecha);
  if (!parsed || !window) return [];

  const config = getReservationConfig();
  const reservations = await prisma.reserva.findMany({
    where: {
      fecha: prismaDate(fecha),
      estado: { in: [...ACTIVE_RESERVATION_STATES] },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { hora: true, personas: true },
  });

  const reservedByTime = new Map<string, number>();
  for (const reservation of reservations) {
    reservedByTime.set(
      reservation.hora,
      (reservedByTime.get(reservation.hora) ?? 0) + reservation.personas,
    );
  }

  const slots: Array<{
    hora: string;
    capacity: number;
    reserved: number;
    remaining: number;
  }> = [];

  for (
    let minute = window.openMinutes;
    minute <= window.closeMinutes - config.slotMinutes;
    minute += config.slotMinutes
  ) {
    const hora = formatMinutes(minute);
    const reserved = reservedByTime.get(hora) ?? 0;
    slots.push({
      hora,
      capacity: config.maxDinersPerSlot,
      reserved,
      remaining: Math.max(0, config.maxDinersPerSlot - reserved),
    });
  }

  return slots;
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

  const slots = await listAvailabilityForDate(fecha, excludeId);
  const slot = slots.find((entry) => entry.hora === hora);
  if (!slot) {
    throw new Error("La franja solicitada no pertenece al horario de reservas.");
  }

  const available = slot.remaining >= personas;
  const target = toMinutes(hora) ?? 0;
  const alternatives = slots
    .filter((entry) => entry.remaining >= personas && entry.hora !== hora)
    .sort((a, b) => {
      const aDistance = Math.abs((toMinutes(a.hora) ?? 0) - target);
      const bDistance = Math.abs((toMinutes(b.hora) ?? 0) - target);
      return aDistance - bDistance;
    })
    .slice(0, 3)
    .map((entry) => entry.hora);

  return {
    available,
    fecha,
    hora,
    personas,
    capacity: slot.capacity,
    reserved: slot.reserved,
    remaining: slot.remaining,
    alternatives,
  };
}
