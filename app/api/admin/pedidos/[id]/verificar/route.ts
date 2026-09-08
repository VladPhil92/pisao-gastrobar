import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { drainRewardsAfterCommit } from "@/lib/ctgone/rewards";

/** Valida (o rechaza) manualmente el comprobante de un pago QR/transferencia. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["ADMIN", "CAJERO"].includes(rol ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { aprobado } = (await request.json()) as { aprobado: boolean };

  const result = await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id },
      select: { id: true, total: true, ctgOneSubject: true },
    });
    if (!pedido) throw new Error("PEDIDO_NOT_FOUND");

    const pago = await tx.pago.update({
      where: { pedidoId: id },
      data: {
        estado: aprobado ? "APROBADO" : "RECHAZADO",
        verificadoPorId: (session.user as { id?: string }).id,
        verificadoEn: new Date(),
      },
    });

    await tx.pedido.update({
      where: { id },
      data: { estado: aprobado ? "CONFIRMADO" : "CANCELADO" },
    });

    if (pedido.ctgOneSubject) {
      const type = aprobado ? "ORDER_PAID" : "ORDER_CANCELLED";
      await tx.ctgOneRewardOutbox.upsert({
        where: { eventKey: `pisao:order:${id}:${type.toLowerCase()}` },
        update: {},
        create: {
          eventKey: `pisao:order:${id}:${type.toLowerCase()}`,
          type,
          ctgOneSubject: pedido.ctgOneSubject,
          pedidoId: id,
          amountCop: pedido.total,
        },
      });
    }

    return { pago };
  });

  await drainRewardsAfterCommit();
  return NextResponse.json(result);
}
