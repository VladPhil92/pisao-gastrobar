import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCardPaymentProvider } from "@/lib/payments/providers";

/**
 * Webhook único para el proveedor de tarjeta activo. La verificación de
 * firma y el parseo del payload quedan delegados al conector
 * (Wompi/PayU/ePayco) para no acoplar esta ruta a un proveedor.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const provider = getCardPaymentProvider();

  if (!provider.verificarFirmaWebhook(rawBody, request.headers)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const evento = provider.normalizarWebhook(payload);

  const pago = await prisma.pago.findFirst({
    where: { referenciaProveedor: evento.referencia },
  });

  if (!pago) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  await prisma.pago.update({
    where: { id: pago.id },
    data: { estado: evento.estado, payloadProveedor: payload },
  });

  if (evento.estado === "APROBADO") {
    await prisma.pedido.update({
      where: { id: pago.pedidoId },
      data: { estado: "CONFIRMADO" },
    });
  }

  return NextResponse.json({ ok: true });
}
