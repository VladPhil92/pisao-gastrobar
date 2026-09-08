import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { drainRewardsAfterCommit } from "@/lib/ctgone/rewards";

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  CONFIRMADO: ["EN_PREPARACION", "CANCELADO"],
  EN_PREPARACION: ["LISTO", "CANCELADO"],
  LISTO: ["EN_CAMINO", "ENTREGADO", "CANCELADO"],
  EN_CAMINO: ["ENTREGADO", "CANCELADO"],
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;
  if (!session?.user || !["ADMIN", "CAJERO", "COCINA"].includes(rol ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { estado?: string };
  const nextState = body.estado?.trim() ?? "";

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    select: { estado: true },
  });
  if (!pedido) return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });

  if (!ALLOWED_TRANSITIONS[pedido.estado]?.includes(nextState)) {
    return NextResponse.json(
      { error: `Transición no permitida: ${pedido.estado} -> ${nextState}` },
      { status: 409 },
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.pedido.findUnique({
      where: { id },
      select: { id: true, estado: true, total: true, ctgOneSubject: true },
    });
    if (!current || current.estado !== pedido.estado) {
      throw new Error("ORDER_STATE_CHANGED");
    }

    const row = await tx.pedido.update({
      where: { id },
      data: { estado: nextState as typeof current.estado },
    });

    if (current.ctgOneSubject && (nextState === "ENTREGADO" || nextState === "CANCELADO")) {
      const type = nextState === "ENTREGADO" ? "ORDER_FULFILLED" : "ORDER_CANCELLED";
      const eventKey = `pisao:order:${id}:${type.toLowerCase()}`;
      await tx.ctgOneRewardOutbox.upsert({
        where: { eventKey },
        update: {},
        create: {
          eventKey,
          type,
          ctgOneSubject: current.ctgOneSubject,
          pedidoId: id,
          amountCop: current.total,
        },
      });
    }

    return row;
  });

  await drainRewardsAfterCommit();
  return NextResponse.json({ pedido: updated });
}
