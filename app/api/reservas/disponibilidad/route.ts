import { NextResponse } from "next/server";
import {
  checkReservationAvailability,
  listAvailabilityForDate,
  validateReservationWindow,
} from "@/lib/reservas/availability";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fecha = url.searchParams.get("fecha") ?? "";
  const hora = url.searchParams.get("hora");
  const personas = Number(url.searchParams.get("personas") ?? "2");

  if (!fecha || !Number.isInteger(personas) || personas < 1 || personas > 30) {
    return NextResponse.json(
      { error: "Parámetros de disponibilidad inválidos." },
      { status: 400 },
    );
  }

  try {
    if (!hora) {
      const slots = await listAvailabilityForDate(fecha);
      return NextResponse.json({
        fecha,
        personas,
        slots: slots.map((slot) => ({
          ...slot,
          available: slot.remaining >= personas,
        })),
      });
    }

    const validation = validateReservationWindow(fecha, hora);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error, code: validation.code },
        { status: 400 },
      );
    }

    const availability = await checkReservationAvailability({
      fecha,
      hora,
      personas,
    });

    return NextResponse.json({ availability });
  } catch (error) {
    console.error("[PISAO RESERVAS] Error consultando disponibilidad", error);
    return NextResponse.json(
      {
        error: "No fue posible consultar disponibilidad en este momento.",
        code: "AVAILABILITY_UNAVAILABLE",
      },
      { status: 503 },
    );
  }
}
