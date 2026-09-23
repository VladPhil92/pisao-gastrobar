import { NextResponse } from "next/server";
import { crearPedidoSchema } from "@/lib/orders/schema";
import {
  crearPedido,
  OrderCatalogValidationError,
} from "@/lib/orders/create-order";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { captureServerError } from "@/lib/observability/sentry-transport";

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return NextResponse.json(
      { error: "Origen de solicitud no permitido.", code: edgeOrigin.code },
      { status: 403 },
    );
  }

  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `order:${identity}`,
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de pedido." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    const body = await request.json();
    const parsed = crearPedidoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", detalles: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (
      parsed.data.metodoPago === "TARJETA" &&
      process.env.CARD_PAYMENTS_ENABLED !== "true"
    ) {
      return NextResponse.json(
        {
          error: "Tarjeta y PSE estarán disponibles próximamente.",
          code: "PAYMENT_METHOD_DISABLED",
        },
        { status: 409 },
      );
    }

    const baseUrl = new URL(request.url).origin;
    const resultado = await crearPedido(parsed.data, baseUrl);

    void emitKevGovernanceEvent("pisao.order.created", {
      order_ref: governanceRef(resultado.pedido.id),
      source: "order_api",
      total: Number(resultado.pedido.total),
      item_count: parsed.data.items.reduce(
        (sum, item) => sum + item.cantidad,
        0,
      ),
      tipo_entrega: parsed.data.tipoEntrega,
      metodo_pago: parsed.data.metodoPago,
      estado: resultado.pedido.estado,
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error instanceof OrderCatalogValidationError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: 409 },
      );
    }

    void captureServerError(error, {
      surface: "order_api",
      code: "ORDER_CREATE_FAILED",
    });

    return NextResponse.json(
      {
        error: "No fue posible crear el pedido en este momento.",
        code: "ORDER_CREATE_FAILED",
      },
      { status: 503 },
    );
  }
}
