import { prisma } from "@/lib/prisma";
import { calcularTotalesPedido } from "./calculations";
import type { CrearPedidoInput } from "./types";
import { getCardPaymentProvider } from "@/lib/payments/providers";
import { crearCargoCripto } from "@/lib/payments/crypto";

/**
 * Crea el Pedido + ItemPedido + Pago inicial, y dispara la parte
 * específica de cada método de pago:
 * - QR_TRANSFERENCIA: el pedido queda PENDIENTE_VERIFICACION, a la
 *   espera de que el cliente suba el comprobante (ver
 *   /api/pagos/qr/comprobante) y un admin/cajero lo valide.
 * - CRIPTO: se solicita un cargo al gateway configurado y se aplica el
 *   descuento automático; la confirmación llega luego por webhook.
 * - TARJETA: se genera un link de pago con el proveedor activo
 *   (Wompi/PayU/ePayco, según PAYMENT_GATEWAY_PROVIDER).
 */
export async function crearPedido(input: CrearPedidoInput, baseUrl: string) {
  const { subtotal, descuento, total } = calcularTotalesPedido(
    input.items,
    input.metodoPago,
  );

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
      estado:
        input.metodoPago === "QR_TRANSFERENCIA"
          ? "PENDIENTE_VERIFICACION"
          : "PENDIENTE_PAGO",
      items: {
        create: input.items.map((item) => ({
          productoId: item.productoId,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
          subtotal: item.precio * item.cantidad,
        })),
      },
    },
  });

  if (input.metodoPago === "QR_TRANSFERENCIA") {
    await prisma.pago.create({
      data: {
        pedidoId: pedido.id,
        metodo: "QR_TRANSFERENCIA",
        estado: "PENDIENTE",
        monto: total,
      },
    });
    return { pedido };
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
        criptoMoneda: cargo.criptoMoneda,
        walletDireccion: cargo.direccionPago,
        descuentoAplicadoPct: descuento > 0 ? (descuento / subtotal) * 100 : 0,
        referenciaProveedor: cargo.referencia,
      },
    });

    return { pedido, cripto: cargo };
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
    redirectUrl: `${baseUrl}/pedidos/confirmacion?pedido=${pedido.id}`,
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

  return { pedido, tarjeta: resultado };
}
