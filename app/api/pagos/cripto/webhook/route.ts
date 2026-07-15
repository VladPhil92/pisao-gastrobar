import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook del gateway cripto. Debe validarse la firma propia del
 * proveedor configurado (CRYPTO_GATEWAY_PROVIDER) antes de confiar en
 * el payload — placeholder hasta integrar un proveedor concreto.
 */
export async function POST(request: Request) {
  const payload = await request.json();

  // TODO: validar firma/secret del gateway cripto (header propio del proveedor).

  const referencia: string | undefined =
    payload?.referencia ?? payload?.reference;
  const txHash: string | undefined = payload?.txHash ?? payload?.tx_hash;
  const confirmaciones: number | undefined = payload?.confirmaciones;
  const estadoOnchain: string | undefined = payload?.estado ?? payload?.status;

  if (!referencia) {
    return NextResponse.json({ error: "Falta referencia" }, { status: 400 });
  }

  const pago = await prisma.pago.findFirst({
    where: { referenciaProveedor: referencia },
  });
  if (!pago) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  const aprobado =
    estadoOnchain === "APROBADO" || estadoOnchain === "confirmed";

  await prisma.pago.update({
    where: { id: pago.id },
    data: {
      estado: aprobado ? "APROBADO" : "EN_VERIFICACION",
      txHash,
      confirmacionesOnchain: confirmaciones,
    },
  });

  if (aprobado) {
    await prisma.pedido.update({
      where: { id: pago.pedidoId },
      data: { estado: "CONFIRMADO" },
    });
  }

  return NextResponse.json({ ok: true });
}
