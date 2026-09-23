import { NextResponse } from "next/server";
import {
  orderTrackingTokenFromRequest,
  resolveOrderTrackingAccess,
} from "@/lib/orders/tracking-access";
import { buildOrderTrackingSnapshot } from "@/lib/orders/tracking";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";

function privateHeaders() {
  return {
    "Cache-Control": "no-store, private",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `order-detail-read:${identity}`,
    limit: 120,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiadas consultas." },
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
  const { id } = await params;

  if (!token) {
    return NextResponse.json(
      { error: "Acceso no autorizado." },
      { status: 401, headers: privateHeaders() },
    );
  }

  const access = await resolveOrderTrackingAccess(token);
  if (!access || access.pedido.id !== id) {
    return NextResponse.json(
      { error: "Pedido no encontrado." },
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
}
