import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { drainRewardsAfterCommit } from "@/lib/ctgone/rewards";

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  PENDIENTE: ["CONFIRMADA", "CANCELADA"],
  CONFIRMADA: ["COMPLETADA", "CANCELADA"],
};

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
  const body = (await request.json()) as { estado?: string };
  const nextState = body.estado?.trim() ?? "";

  const current = await prisma.reserva.findUnique({
    where: { id },
    select: { id: true, estado: true, ctgOneSubject: true },
  });
  if (!current) return NextResponse.json({ error: "Reserva no encontrada" }, { status: 404 });

  if (!ALLOWED_TRANSITIONS[current.estado]?.includes(nextState)) {
    return NextResponse.json(
      { error: `Transición no permitida: ${current.estado} -> ${nextState}` },
      { status: 409 },
    );
  }

  const reserva = await prisma.$transaction(async (tx) => {
    const fresh = await tx.reserva.findUnique({
      where: { id },
      select: { id: true, estado: true, ctgOneSubject: true },
    });
    if (!fresh || fresh.estado !== current.estado) throw new Error("RESERVATION_STATE_CHANGED");

    const updated = await tx.reserva.update({
      where: { id },
      data: { estado: nextState as typeof fresh.estado },
    });

    if (fresh.ctgOneSubject && nextState === "COMPLETADA") {
      const eventKey = `pisao:reservation:${id}:completed`;
      await tx.ctgOneRewardOutbox.upsert({
        where: { eventKey },
        update: {},
        create: {
          eventKey,
          type: "RESERVATION_COMPLETED",
          ctgOneSubject: fresh.ctgOneSubject,
          reservaId: id,
        },
      });
    }

    return updated;
  });

  await drainRewardsAfterCommit();
  return NextResponse.json({ reserva });
}
