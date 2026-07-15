import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const pago = await prisma.pago.update({
    where: { pedidoId: id },
    data: {
      estado: aprobado ? "APROBADO" : "RECHAZADO",
      verificadoPorId: (session.user as { id?: string }).id,
      verificadoEn: new Date(),
    },
  });

  await prisma.pedido.update({
    where: { id },
    data: { estado: aprobado ? "CONFIRMADO" : "CANCELADO" },
  });

  return NextResponse.json({ pago });
}
