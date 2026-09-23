import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeCustomerPhone } from "@/lib/orders/tracking";
import { issueOrderTrackingAccess } from "@/lib/orders/tracking-access";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { captureServerError } from "@/lib/observability/sentry-transport";

const recoverySchema = z.object({
  numero: z.coerce.number().int().positive().max(10_000_000),
  telefono: z.string().trim().min(7).max(32),
});

function phoneMatches(stored: string, supplied: string) {
  const left = Buffer.from(normalizeCustomerPhone(stored));
  const right = Buffer.from(normalizeCustomerPhone(supplied));
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

function privateHeaders() {
  return {
    "Cache-Control": "no-store, private",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return NextResponse.json(
      { error: "Origen de solicitud no permitido.", code: edgeOrigin.code },
      { status: 403, headers: privateHeaders() },
    );
  }

  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `order-tracking-recovery:${identity}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de recuperación." },
      {
        status: 429,
        headers: {
          ...privateHeaders(),
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  try {
    const body = await request.json();
    const parsed = recoverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de recuperación inválidos." },
        { status: 400, headers: privateHeaders() },
      );
    }

    const pedido = await prisma.pedido.findUnique({
      where: { numero: parsed.data.numero },
      select: {
        id: true,
        numero: true,
        clienteTelefono: true,
      },
    });

    if (!pedido || !phoneMatches(pedido.clienteTelefono, parsed.data.telefono)) {
      return NextResponse.json(
        {
          error:
            "No pudimos verificar un pedido con esos datos.",
          code: "TRACKING_RECOVERY_NOT_VERIFIED",
        },
        { status: 404, headers: privateHeaders() },
      );
    }

    const seguimiento = await issueOrderTrackingAccess(pedido.id);

    return NextResponse.json(
      {
        ok: true,
        pedidoNumero: pedido.numero,
        seguimiento: {
          token: seguimiento.token,
          url: seguimiento.url,
          expiresAt: seguimiento.expiresAt.toISOString(),
        },
      },
      { status: 201, headers: privateHeaders() },
    );
  } catch (error) {
    void captureServerError(error, {
      surface: "order_tracking_recovery",
      code: "ORDER_TRACKING_RECOVERY_FAILED",
    });

    return NextResponse.json(
      {
        error: "No fue posible recuperar el seguimiento en este momento.",
        code: "ORDER_TRACKING_RECOVERY_FAILED",
      },
      { status: 503, headers: privateHeaders() },
    );
  }
}
