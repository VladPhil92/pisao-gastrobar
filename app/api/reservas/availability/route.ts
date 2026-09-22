import { NextResponse } from "next/server";
import { checkReservationAvailability } from "@/lib/reservas/availability";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  const url = new URL(request.url);
  const fecha = url.searchParams.get("fecha")?.trim() ?? "";
  const hora = url.searchParams.get("hora")?.trim() ?? "";
  const personas = Number(url.searchParams.get("personas"));

  if (!fecha || !hora || !Number.isInteger(personas) || personas < 1 || personas > 30) {
    return NextResponse.json(
      { error: "Debes indicar fecha, hora y personas válidas." },
      { status: 400 },
    );
  }

  try {
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
    const message =
      error instanceof Error
        ? error.message
        : "No fue posible consultar la disponibilidad.";

    const isValidationError =
      /fecha|hora|franja|anticipación|reservas/i.test(message);

    return NextResponse.json(
      { error: message },
      {
        status: isValidationError ? 400 : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
