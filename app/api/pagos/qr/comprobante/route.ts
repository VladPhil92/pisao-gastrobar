import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subirComprobantePago } from "@/lib/uploads/evidencia";
import {
  EVIDENCIA_TIPOS_PERMITIDOS,
  EVIDENCIA_TAMANO_MAXIMO_MB,
} from "@/lib/payments/qr-transferencia";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { captureServerError } from "@/lib/observability/sentry-transport";

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return NextResponse.json(
      { error: "Origen de solicitud no permitido.", code: edgeOrigin.code },
      { status: 403 },
    );
  }

  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `payment-evidence:${identity}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de carga." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

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

  try {
    const comprobanteUrl = await subirComprobantePago(file);

    const pago = await prisma.pago.update({
      where: { pedidoId },
      data: { comprobanteUrl, estado: "EN_VERIFICACION" },
    });

    // El pedido permanece PENDIENTE_VERIFICACION hasta validación manual
    // en /admin/pedidos por un usuario con rol ADMIN o CAJERO.
    return NextResponse.json({ pago });
  } catch (error) {
    void captureServerError(error, {
      surface: "payment_evidence",
      code: "PAYMENT_EVIDENCE_FAILED",
    });

    return NextResponse.json(
      { error: "No fue posible procesar el comprobante." },
      { status: 503 },
    );
  }
}
