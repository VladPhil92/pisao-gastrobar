import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATES = ["PENDIENTE", "CONFIRMADA", "CANCELADA", "COMPLETADA"] as const;
type ReservationState = (typeof STATES)[number];

const transitions: Record<ReservationState, ReservationState[]> = {
  PENDIENTE: ["CONFIRMADA", "CANCELADA"],
  CONFIRMADA: ["COMPLETADA", "CANCELADA"],
  CANCELADA: [],
  COMPLETADA: [],
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["ADMIN", "CAJERO"].includes(rol ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = (await request.json()) as { estado?: string };

    if (!STATES.includes(body.estado as ReservationState)) {
      return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
    }

    const nextState = body.estado as ReservationState;
    const current = await prisma.reserva.findUnique({
      where: { id },
      select: { id: true, estado: true },
    });

    if (!current) {
      return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
    }

    if (!transitions[current.estado].includes(nextState)) {
      return NextResponse.json(
        {
          error: `No se puede cambiar una reserva ${current.estado.toLowerCase()} a ${nextState.toLowerCase()}.`,
        },
        { status: 409 },
      );
    }

    const reserva = await prisma.reserva.update({
      where: { id },
      data: { estado: nextState },
      select: {
        id: true,
        estado: true,
        nombre: true,
        fecha: true,
        hora: true,
        personas: true,
      },
    });

    return NextResponse.json({ reserva });
  } catch (error) {
    console.error("[PISAO ADMIN] Error actualizando reserva", error);
    return NextResponse.json(
      { error: "No fue posible actualizar la reserva." },
      { status: 503 },
    );
  }
}
