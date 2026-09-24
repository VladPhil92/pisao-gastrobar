import "server-only";

import { prisma } from "@/lib/prisma";
import {
  allocateReservableTables,
  calculateReservedForStart,
  getReservationConfig,
  listBookableStartsForDate,
  validateReservationWindow,
} from "@/lib/reservas/availability";
import { notifyReservationCreated } from "@/lib/reservas/notifications";
import type { ReservaFormValues } from "@/lib/reservas/schema";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";
import { resolveCrmCustomerProfile } from "@/lib/crm/customer-identity";

export class ReservationConflictError extends Error {
  code: "DUPLICATE" | "NO_AVAILABILITY";

  constructor(code: ReservationConflictError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

function normalizePhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}

export async function createConfirmedReservation(
  input: ReservaFormValues,
  source: string,
) {
  const { nombre, telefono, email, fecha, hora, personas, notas } = input;
  const windowValidation = validateReservationWindow(fecha, hora);

  if (!windowValidation.ok) {
    const error = new Error(windowValidation.error) as Error & {
      code?: string;
    };
    error.code = windowValidation.code;
    throw error;
  }

  const fechaDb = new Date(`${fecha}T00:00:00.000Z`);
  const cleanPhone = normalizePhone(telefono);
  const config = getReservationConfig();

  const reserva = await prisma.$transaction(async (tx) => {
    const lockKey = `reservation-day|${fecha}`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

    const duplicate = await tx.reserva.findFirst({
      where: {
        telefono: cleanPhone,
        fecha: fechaDb,
        hora,
        estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new ReservationConflictError(
        "DUPLICATE",
        "Ya existe una solicitud activa con ese teléfono para la misma fecha y hora.",
      );
    }

    const activeReservations = await tx.reserva.findMany({
      where: {
        fecha: fechaDb,
        estado: { in: ["PENDIENTE", "CONFIRMADA"] },
      },
      select: { hora: true, personas: true, mesas: true },
    });

    const tables = await tx.mesaReservable.findMany({
      orderBy: [{ prioridad: "asc" }, { codigo: "asc" }],
    });

    const reserved = calculateReservedForStart(activeReservations, hora);
    const allocation = allocateReservableTables(
      activeReservations,
      hora,
      personas,
      tables,
    );

    if (
      reserved + personas > config.maxDinersPerSlot ||
      !allocation.available
    ) {
      throw new ReservationConflictError(
        "NO_AVAILABILITY",
        "La franja seleccionada ya no tiene mesas reservables suficientes para ese grupo.",
      );
    }

    return tx.reserva.create({
      data: {
        nombre,
        telefono: cleanPhone,
        email: email || undefined,
        fecha: fechaDb,
        hora,
        personas,
        notas: notas || undefined,
        mesas: allocation.assignedTables,
        estado: "CONFIRMADA",
      },
    });
  });

  const customerProfile = await resolveCrmCustomerProfile({
    nombre,
    email,
    telefono: cleanPhone,
    source: "RESERVATION",
  });
  if (customerProfile) {
    await prisma.reserva.update({
      where: { id: reserva.id },
      data: { customerProfileId: customerProfile.id },
    });
  }

  await notifyReservationCreated({
    id: reserva.id,
    nombre: reserva.nombre,
    telefono: reserva.telefono,
    email: reserva.email,
    fecha,
    hora: reserva.hora,
    personas: reserva.personas,
    notas: reserva.notas,
    mesas: reserva.mesas,
  });

  void emitKevGovernanceEvent("pisao.reservation.confirmed", {
    reservation_ref: governanceRef(reserva.id),
    source,
    personas: reserva.personas,
    fecha,
    hora: reserva.hora,
    mesas: reserva.mesas,
    estado: reserva.estado,
  });

  return {
    id: reserva.id,
    estado: reserva.estado,
    fecha,
    hora: reserva.hora,
    personas: reserva.personas,
    mesas: reserva.mesas,
  };
}

export async function reservationAlternatives(params: {
  fecha: string;
  personas: number;
}) {
  try {
    const slots = await listBookableStartsForDate(
      params.fecha,
      params.personas,
    );
    return slots
      .filter((slot) => slot.available)
      .slice(0, 4)
      .map((slot) => slot.hora);
  } catch {
    return [];
  }
}
