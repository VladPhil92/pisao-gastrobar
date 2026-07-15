import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subirComprobantePago } from "@/lib/uploads/evidencia";
import {
  EVIDENCIA_TIPOS_PERMITIDOS,
  EVIDENCIA_TAMANO_MAXIMO_MB,
} from "@/lib/payments/qr-transferencia";

export async function POST(request: Request) {
  const formData = await request.formData();
  const pedidoId = formData.get("pedidoId");
  const file = formData.get("comprobante");

  if (typeof pedidoId !== "string" || !(file instanceof File)) {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (!EVIDENCIA_TIPOS_PERMITIDOS.includes(file.type)) {
    return NextResponse.json(
      { error: "Formato no permitido. Usa imagen o PDF." },
      { status: 400 },
    );
  }

  if (file.size > EVIDENCIA_TAMANO_MAXIMO_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `El archivo supera ${EVIDENCIA_TAMANO_MAXIMO_MB}MB.` },
      { status: 400 },
    );
  }

  const comprobanteUrl = await subirComprobantePago(file);

  const pago = await prisma.pago.update({
    where: { pedidoId },
    data: { comprobanteUrl, estado: "EN_VERIFICACION" },
  });

  // El pedido permanece PENDIENTE_VERIFICACION hasta validación manual
  // en /admin/pedidos por un usuario con rol ADMIN o CAJERO.

  return NextResponse.json({ pago });
}
