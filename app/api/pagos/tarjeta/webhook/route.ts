import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCardPaymentProvider } from "@/lib/payments/providers";
import { drainRewardsAfterCommit } from "@/lib/ctgone/rewards";

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

  await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: pago.pedidoId },
      select: { id: true, total: true, ctgOneSubject: true },
    });
    if (!pedido) throw new Error("PEDIDO_NOT_FOUND");

    await tx.pago.update({
      where: { id: pago.id },
      data: { estado: evento.estado, payloadProveedor: payload },
    });

    if (evento.estado === "APROBADO" || evento.estado === "RECHAZADO") {
      await tx.pedido.update({
        where: { id: pago.pedidoId },
        data: { estado: evento.estado === "APROBADO" ? "CONFIRMADO" : "CANCELADO" },
      });
    }

    if (pedido.ctgOneSubject && (evento.estado === "APROBADO" || evento.estado === "RECHAZADO")) {
      const type = evento.estado === "APROBADO" ? "ORDER_PAID" : "ORDER_CANCELLED";
      const eventKey = `pisao:order:${pedido.id}:${type.toLowerCase()}`;
      await tx.ctgOneRewardOutbox.upsert({
        where: { eventKey },
        update: {},
        create: {
          eventKey,
          type,
          ctgOneSubject: pedido.ctgOneSubject,
          pedidoId: pedido.id,
          amountCop: pedido.total,
        },
      });
    }
  });

  await drainRewardsAfterCommit();
  return NextResponse.json({ ok: true });
}
