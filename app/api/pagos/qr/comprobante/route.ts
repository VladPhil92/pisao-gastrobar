import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { prepararComprobantePago } from "@/lib/uploads/evidencia";
import {
  EVIDENCIA_TIPOS_PERMITIDOS,
  EVIDENCIA_TAMANO_MAXIMO_MB,
} from "@/lib/payments/qr-transferencia";
import { notifyPaymentAdmin } from "@/lib/notifications/payment-admin";
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
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        pago: true,
        items: {
          include: {
            producto: { select: { nombre: true } },
          },
        },
      },
    });

    if (!pedido?.pago) {
      return NextResponse.json(
        { error: "Pedido o pago no encontrado." },
        { status: 404 },
      );
    }

    if (pedido.pago.metodo !== "QR_TRANSFERENCIA") {
      return NextResponse.json(
        { error: "Este pedido no usa pago por QR o transferencia." },
        { status: 409 },
      );
    }

    if (
      pedido.pago.estado === "APROBADO" ||
      pedido.estado === "CONFIRMADO" ||
      pedido.estado === "ENTREGADO"
    ) {
      return NextResponse.json(
        { error: "Este pago ya fue validado." },
        { status: 409 },
      );
    }

    const evidence = await prepararComprobantePago(file);
    const comprobanteUrl = `/api/admin/pedidos/${pedidoId}/comprobante`;
    const receivedAt = new Date();

    await prisma.pago.update({
      where: { pedidoId },
      data: {
        comprobanteUrl,
        comprobanteNombre: evidence.fileName,
        comprobanteMime: evidence.mimeType,
        comprobanteBytes: evidence.bytes,
        comprobanteSha256: evidence.sha256,
        comprobanteRecibidoEn: receivedAt,
        estado: "EN_VERIFICACION",
      },
    });

    const notification = await notifyPaymentAdmin(
      {
        id: pedido.id,
        numero: pedido.numero,
        clienteNombre: pedido.clienteNombre,
        clienteTelefono: pedido.clienteTelefono,
        clienteEmail: pedido.clienteEmail,
        tipoEntrega: pedido.tipoEntrega,
        direccionEntrega: pedido.direccionEntrega,
        notas: pedido.notas,
        total: Number(pedido.total),
        items: pedido.items.map((item) => ({
          nombre: item.producto.nombre,
          cantidad: item.cantidad,
          subtotal: Number(item.subtotal),
        })),
      },
      evidence,
    );

    return NextResponse.json({
      ok: true,
      pago: {
        estado: "EN_VERIFICACION",
        comprobanteRecibidoEn: receivedAt.toISOString(),
      },
      adminNotification: notification.delivery,
      notificationProvider: notification.provider,
      whatsappUrl: notification.whatsappUrl,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_PAYMENT_EVIDENCE_SIGNATURE"
    ) {
      return NextResponse.json(
        { error: "El archivo no coincide con un comprobante de imagen/PDF válido." },
        { status: 400 },
      );
    }

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
