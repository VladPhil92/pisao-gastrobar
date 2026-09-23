import { NextResponse } from "next/server";
import { reservaSchema } from "@/lib/reservas/schema";
import {
  createConfirmedReservation,
  reservationAlternatives,
  ReservationConflictError,
} from "@/lib/reservas/create-reservation";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { captureServerError } from "@/lib/observability/sentry-transport";

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

  let conflictInput: { fecha: string; hora: string; personas: number } | null =
    null;

  try {
    const body = await request.json();
    const security = await verifyTurnstile({
      token: request.headers.get("x-turnstile-token"),
      remoteIp: identity,
      expectedAction: "reservation",
    });

    if (!security.ok) {
      return NextResponse.json(
        {
          error: "No pudimos validar la verificación de seguridad. Intenta nuevamente.",
          code: security.code,
        },
        { status: 403 },
      );
    }
    const parsed = reservaSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }

    conflictInput = {
      fecha: parsed.data.fecha,
      hora: parsed.data.hora,
      personas: parsed.data.personas,
    };

    const reserva = await createConfirmedReservation(
      parsed.data,
      "reservation_api",
    );

    return NextResponse.json({ reserva }, { status: 201 });
  } catch (error) {
    if (error instanceof ReservationConflictError) {
      const alternatives =
        error.code === "NO_AVAILABILITY" && conflictInput
          ? await reservationAlternatives({
              fecha: conflictInput.fecha,
              personas: conflictInput.personas,
            })
          : [];

      if (conflictInput) {
        void emitKevGovernanceEvent("pisao.reservation.rejected", {
          source: "reservation_api",
          personas: conflictInput.personas,
          fecha: conflictInput.fecha,
          hora: conflictInput.hora,
          reason: error.code,
          alternatives_count: alternatives.length,
        });
      }

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          ...(alternatives.length ? { alternatives } : {}),
        },
        { status: 409 },
      );
    }

    if (
      error instanceof Error &&
      "code" in error &&
      typeof (error as Error & { code?: unknown }).code === "string"
    ) {
      const coded = error as Error & { code: string };
      return NextResponse.json(
        { error: coded.message, code: coded.code },
        { status: 400 },
      );
    }

    void captureServerError(error, {
      surface: "reservation_api",
      code: "RESERVATION_SERVICE_UNAVAILABLE",
    });
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
