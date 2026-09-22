import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reservaSchema } from "@/lib/reservas/schema";
import {
  calculateReservedForStart,
  getReservationConfig,
  listBookableStartsForDate,
  validateReservationWindow,
} from "@/lib/reservas/availability";
import { notifyReservationCreated } from "@/lib/reservas/notifications";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";

class ReservationConflictError extends Error {
  code: "DUPLICATE" | "NO_AVAILABILITY";

  constructor(code: ReservationConflictError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

function normalizePhone(value: string) {
  return value.replace(/[^+\d]/g, "");
}

export async function POST(request: Request) {
  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `reservation:${identity}`,
    limit: 12,
    windowMs: 60 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de reserva. Intenta nuevamente más tarde." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  let conflictInput: { fecha: string; personas: number } | null = null;

  try {
    const body = await request.json();
    const parsed = reservaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { nombre, telefono, email, fecha, hora, personas, notas } = parsed.data;
    const windowValidation = validateReservationWindow(fecha, hora);

    if (!windowValidation.ok) {
      return NextResponse.json(
        { error: windowValidation.error, code: windowValidation.code },
        { status: 400 },
      );
    }

    conflictInput = { fecha, personas };

    const fechaDb = new Date(`${fecha}T00:00:00.000Z`);
    const cleanPhone = normalizePhone(telefono);
    const config = getReservationConfig();

    const reserva = await prisma.$transaction(async (tx) => {
      // Serializa las reservas del mismo día porque una mesa ocupa varias franjas.
      // Así dos solicitudes concurrentes de 18:00 y 18:30 no pueden sobre-vender
      // una capacidad que comparten durante la ventana de ocupación.
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
        select: { hora: true, personas: true },
      });

      const reserved = calculateReservedForStart(activeReservations, hora);

      if (reserved + personas > config.maxDinersPerSlot) {
        throw new ReservationConflictError(
          "NO_AVAILABILITY",
          "La franja seleccionada ya no tiene capacidad suficiente.",
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
          estado: "CONFIRMADA",
        },
      });
    });

    await notifyReservationCreated({
      id: reserva.id,
      nombre: reserva.nombre,
      telefono: reserva.telefono,
      email: reserva.email,
      fecha,
      hora: reserva.hora,
      personas: reserva.personas,
      notas: reserva.notas,
    });

    return NextResponse.json(
      {
        reserva: {
          id: reserva.id,
          estado: reserva.estado,
          fecha,
          hora: reserva.hora,
          personas: reserva.personas,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ReservationConflictError) {
      if (error.code === "NO_AVAILABILITY") {
        let alternatives: string[] = [];

        if (conflictInput) {
          try {
            const slots = await listBookableStartsForDate(
              conflictInput.fecha,
              conflictInput.personas,
            );
            alternatives = slots
              .filter((slot) => slot.available)
              .slice(0, 4)
              .map((slot) => slot.hora);
          } catch {
            alternatives = [];
          }
        }

        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            alternatives,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 409 },
      );
    }

    console.error("[PISAO RESERVAS] Error creando reserva", error);
    return NextResponse.json(
      {
        error:
          "El sistema de reservas no está disponible en este momento. Intenta nuevamente o contáctanos por WhatsApp.",
        code: "RESERVATION_SERVICE_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}
