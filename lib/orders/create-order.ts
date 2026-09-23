import { prisma } from "@/lib/prisma";
import { calcularTotalesPedido } from "./calculations";
import type { CrearPedidoInput } from "./types";
import { getCardPaymentProvider } from "@/lib/payments/providers";
import { crearCargoCripto } from "@/lib/payments/crypto";
import { resolveRevenueAttribution } from "@/lib/analytics/revenue-attribution";
import type { CartItem } from "@/lib/cart/types";
import { issueOrderTrackingAccess } from "@/lib/orders/tracking-access";

type ValidatedOrderItem = CartItem & {
  costoUnitario: number | null;
};

type ValidatedOrderItem = CartItem & {
  costoUnitario: number | null;
};

export class OrderCatalogValidationError extends Error {
  constructor(
    public readonly code:
      | "PRODUCT_NOT_FOUND"
      | "PRODUCT_UNAVAILABLE"
      | "PRICE_CHANGED",
    message: string,
  ) {
    super(message);
    this.name = "OrderCatalogValidationError";
  }
}

async function validateCatalogItems(
  items: CrearPedidoInput["items"],
): Promise<ValidatedOrderItem[]> {
  const quantities = new Map<string, number>();
  for (const item of items) {
    quantities.set(
      item.productoId,
      (quantities.get(item.productoId) ?? 0) + item.cantidad,
    );
  }

  const ids = [...quantities.keys()];
  const products = await prisma.producto.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      nombre: true,
      slug: true,
      precio: true,
      costoUnitario: true,
      imagenUrl: true,
      disponible: true,
      categoria: { select: { slug: true } },
    },
  });

  if (products.length !== ids.length) {
    throw new OrderCatalogValidationError(
      "PRODUCT_NOT_FOUND",
      "Uno de los productos ya no está disponible en la carta.",
    );
  }

  const requestedById = new Map(items.map((item) => [item.productoId, item]));

  return products.map((product) => {
    if (!product.disponible) {
      throw new OrderCatalogValidationError(
        "PRODUCT_UNAVAILABLE",
        `${product.nombre} ya no está disponible. Actualiza tu mesa antes de continuar.`,
      );
    }

    const requested = requestedById.get(product.id);
    const serverPrice = Number(product.precio);

    if (!requested || Math.abs(requested.precio - serverPrice) > 0.001) {
      throw new OrderCatalogValidationError(
        "PRICE_CHANGED",
        `El precio de ${product.nombre} cambió. Actualiza la carta antes de pagar.`,
      );
    }

    return {
      productoId: product.id,
      nombre: product.nombre,
      slug: product.slug,
      precio: serverPrice,
      imagenUrl: product.imagenUrl,
      categoriaSlug: product.categoria.slug,
      cantidad: quantities.get(product.id) ?? requested.cantidad,
      costoUnitario:
        product.costoUnitario === null ? null : Number(product.costoUnitario),
    };
  });
}

/**
 * Crea el Pedido + ItemPedido + Pago inicial, y dispara la parte
 * específica de cada método de pago:
 * - QR_TRANSFERENCIA: el pedido queda PENDIENTE_VERIFICACION, a la
 *   espera de que el cliente suba el comprobante (ver
 *   /api/pagos/qr/comprobante) y un admin/cajero lo valide.
 * - CRIPTO: se prepara el pago manual con las wallets públicas y se aplica el
 *   descuento automático; el cliente adjunta comprobante para validación.
 * - TARJETA: se genera un link de pago con el proveedor activo
 *   (Wompi/PayU/ePayco, según PAYMENT_GATEWAY_PROVIDER).
 */
export async function crearPedido(input: CrearPedidoInput, baseUrl: string) {
  const validatedItems = await validateCatalogItems(input.items);
  const { subtotal, descuento, total } = calcularTotalesPedido(
    validatedItems,
    input.metodoPago,
  );

  const attribution = input.attributionSessionId
    ? await resolveRevenueAttribution(input.attributionSessionId)
    : null;

  const pedido = await prisma.pedido.create({
    data: {
      clienteNombre: input.cliente.nombre,
      clienteTelefono: input.cliente.telefono,
      clienteEmail: input.cliente.email,
      tipoEntrega: input.tipoEntrega,
      direccionEntrega: input.direccionEntrega,
      notas: input.notas,
      subtotal,
      descuento,
      total,
      estado: "PENDIENTE_PAGO",
      attribution: attribution
        ? {
            create: {
              sessionId: attribution.sessionId,
              assists: attribution.assists,
              lastAssist: attribution.lastAssist,
              touchCount: attribution.touchCount,
              observedFrom: attribution.observedFrom,
              observedTo: attribution.observedTo,
            },
          }
        : undefined,
      items: {
        create: validatedItems.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
          costoUnitarioSnapshot: item.costoUnitario,
          subtotal: item.precio * item.cantidad,
        })),
      },
    },
  });

  const seguimiento = await issueOrderTrackingAccess(pedido.id);

  if (input.metodoPago === "QR_TRANSFERENCIA") {
    await prisma.pago.create({
      data: {
        pedidoId: pedido.id,
        metodo: "QR_TRANSFERENCIA",
        estado: "PENDIENTE",
        monto: total,
      },
    });
    return { pedido, seguimiento };
  }

  if (input.metodoPago === "CRIPTO") {
    const cargo = await crearCargoCripto({
      pedidoId: pedido.id,
      numeroPedido: pedido.numero,
      montoTotalCop: total,
      webhookUrl: `${baseUrl}/api/pagos/cripto/webhook`,
    });

    await prisma.pago.create({
      data: {
        pedidoId: pedido.id,
        metodo: "CRIPTO",
        estado: "PENDIENTE",
        monto: total,
        descuentoAplicadoPct: descuento > 0 ? (descuento / subtotal) * 100 : 0,
        referenciaProveedor: cargo.referencia,
        payloadProveedor: {
          settlement: "PISAO_CRYPTO_QUOTE_V1",
          quoteAvailable: cargo.quoteAvailable,
          quotedAt:
            cargo.opciones.find((option) => option.quote)?.quote?.quotedAt ?? null,
          quotes: Object.fromEntries(
            cargo.opciones.map((option) => [
              option.moneda,
              option.quote
                ? {
                    copPerUnit: option.quote.copPerUnit,
                    amount: option.quote.amount,
                    provider: option.quote.provider,
                    quotedAt: option.quote.quotedAt,
                  }
                : null,
            ]),
          ),
        },
      },
    });

    return { pedido, cripto: cargo, seguimiento };
  }

  // TARJETA
  const provider = getCardPaymentProvider();
  const resultado = await provider.crearLinkPago({
    pedidoId: pedido.id,
    numeroPedido: pedido.numero,
    montoTotal: total,
    descripcion: `Pedido PISÁO #${pedido.numero}`,
    clienteEmail: input.cliente.email,
    clienteNombre: input.cliente.nombre,
    clienteTelefono: input.cliente.telefono,
    redirectUrl: `${baseUrl}${seguimiento.url}`,
    webhookUrl: `${baseUrl}/api/pagos/tarjeta/webhook`,
  });

  await prisma.pago.create({
    data: {
      pedidoId: pedido.id,
      metodo: "TARJETA",
      estado: "PENDIENTE",
      monto: total,
      proveedorTarjeta: resultado.proveedor,
      linkPago: resultado.linkPago,
      referenciaProveedor: resultado.referencia,
    },
  });

  return { pedido, tarjeta: resultado, seguimiento };
}
