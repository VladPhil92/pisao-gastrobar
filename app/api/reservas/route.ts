import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reservaSchema } from "@/lib/reservas/schema";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = reservaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { nombre, telefono, email, fecha, hora, personas, notas } = parsed.data;

  const reserva = await prisma.reserva.create({
    data: {
      nombre,
      telefono,
      email: email || undefined,
      fecha: new Date(fecha),
      hora,
      personas,
      notas,
    },
  });

  // TODO: enviar confirmación automática por WhatsApp/email al cliente
  // y notificación interna al equipo administrativo.

  return NextResponse.json({ reserva }, { status: 201 });
}
