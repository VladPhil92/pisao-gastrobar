import { NextResponse } from "next/server";
import {
  checkReservationAvailability,
  listAvailabilityForDate,
  validateReservationWindow,
} from "@/lib/reservas/availability";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";

export async function handleReservationAvailabilityRequest(request: Request) {
  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `reservation-availability:${identity}`,
    limit: 90,
    windowMs: 60 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiadas consultas de disponibilidad. Intenta nuevamente más tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rate.retryAfterSeconds),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const url = new URL(request.url);
  const fecha = url.searchParams.get("fecha")?.trim() ?? "";
  const hora = url.searchParams.get("hora")?.trim() || null;
  const personas = Number(url.searchParams.get("personas") ?? "2");

  if (!fecha || !Number.isInteger(personas) || personas < 1 || personas > 30) {
    return NextResponse.json(
      { error: "Debes indicar fecha y personas válidas." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    if (!hora) {
      const slots = await listAvailabilityForDate(fecha);
      return NextResponse.json(
        {
          fecha,
          personas,
          slots: slots.map((slot) => ({
            ...slot,
            available: slot.remaining >= personas,
          })),
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const validation = validateReservationWindow(fecha, hora);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.error, code: validation.code },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const availability = await checkReservationAvailability({
      fecha,
      hora,
      personas,
    });

    return NextResponse.json(
      { availability },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[PISAO RESERVAS] Error consultando disponibilidad", error);
    return NextResponse.json(
      {
        error: "No fue posible consultar disponibilidad en este momento.",
        code: "AVAILABILITY_UNAVAILABLE",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
