import { NextResponse } from "next/server";
import {
  getReservationConfig,
  listReservableTables,
  listReservationCalendar,
} from "@/lib/reservas/availability";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `reservation-calendar:${identity}`,
    limit: 60,
    windowMs: 60 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiadas consultas de calendario. Intenta nuevamente más tarde." },
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
  const start = url.searchParams.get("start")?.trim() || undefined;
  const personas = Number(url.searchParams.get("personas") ?? "2");
  const requestedDays = Number(url.searchParams.get("days") ?? "");

  if (!Number.isInteger(personas) || personas < 1 || personas > 30) {
    return NextResponse.json(
      { error: "Debes indicar un número válido de personas." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const config = getReservationConfig();
  const days =
    Number.isInteger(requestedDays) && requestedDays > 0
      ? Math.min(requestedDays, config.calendarDays)
      : config.calendarDays;

  try {
    const [calendar, tables] = await Promise.all([
      listReservationCalendar({
        start,
        days,
        personas,
      }),
      listReservableTables(),
    ]);

    const activeTables = tables.filter((table) => table.activa);

    return NextResponse.json(
      {
        personas,
        durationMinutes: config.reservationDurationMinutes,
        slotMinutes: config.slotMinutes,
        reservableTableCount: activeTables.length,
        totalReservableSeats: activeTables.reduce(
          (sum, table) => sum + table.capacidad,
          0,
        ),
        calendar,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[PISAO RESERVAS] Error consultando calendario", error);
    return NextResponse.json(
      {
        error: "No fue posible consultar el calendario de disponibilidad.",
        code: "CALENDAR_UNAVAILABLE",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
