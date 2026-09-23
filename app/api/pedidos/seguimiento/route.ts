import { NextResponse } from "next/server";
import {
  orderTrackingTokenFromRequest,
  resolveOrderTrackingAccess,
} from "@/lib/orders/tracking-access";
import { buildOrderTrackingSnapshot } from "@/lib/orders/tracking";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { captureServerError } from "@/lib/observability/sentry-transport";

export const dynamic = "force-dynamic";

function privateHeaders() {
  return {
    "Cache-Control": "no-store, private",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export async function GET(request: Request) {
  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `order-tracking-read:${identity}`,
    limit: 180,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiadas consultas de seguimiento." },
      {
        status: 429,
        headers: {
          ...privateHeaders(),
          "Retry-After": String(rate.retryAfterSeconds),
        },
      },
    );
  }

  const token = orderTrackingTokenFromRequest(request);
  if (!token) {
    return NextResponse.json(
      { error: "Acceso de seguimiento no válido." },
      { status: 401, headers: privateHeaders() },
    );
  }

  try {
    const access = await resolveOrderTrackingAccess(token);

    if (!access) {
      return NextResponse.json(
        {
          error:
            "El enlace de seguimiento no existe, venció o fue reemplazado.",
          code: "TRACKING_ACCESS_INVALID",
        },
        { status: 404, headers: privateHeaders() },
      );
    }

    const snapshot = buildOrderTrackingSnapshot({
      numero: access.pedido.numero,
      total: Number(access.pedido.total),
      tipoEntrega: access.pedido.tipoEntrega,
      estado: access.pedido.estado,
      createdAt: access.pedido.createdAt,
      updatedAt: access.pedido.updatedAt,
      pago: access.pedido.pago,
    });

    return NextResponse.json(snapshot, {
      status: 200,
      headers: privateHeaders(),
    });
  } catch (error) {
    void captureServerError(error, {
      surface: "order_tracking",
      code: "ORDER_TRACKING_READ_FAILED",
    });

    return NextResponse.json(
      {
        error: "No fue posible consultar el pedido en este momento.",
        code: "ORDER_TRACKING_READ_FAILED",
      },
      { status: 503, headers: privateHeaders() },
    );
  }
}
