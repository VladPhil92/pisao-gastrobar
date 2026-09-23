import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";

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

  const pedido = await prisma.pedido.update({
    where: { id },
    data: { estado: aprobado ? "CONFIRMADO" : "CANCELADO" },
    select: {
      id: true,
      estado: true,
      total: true,
      tipoEntrega: true,
      attribution: {
        select: {
          assists: true,
          lastAssist: true,
          touchCount: true,
        },
      },
      items: { select: { cantidad: true } },
    },
  });

  void emitKevGovernanceEvent(
    aprobado ? "pisao.order.confirmed" : "pisao.order.cancelled",
    {
      order_ref: governanceRef(pedido.id),
      source: "admin_payment_verification",
      total: Number(pedido.total),
      item_count: pedido.items.reduce((sum, item) => sum + item.cantidad, 0),
      tipo_entrega: pedido.tipoEntrega,
      estado: pedido.estado,
      attribution_tracked: Boolean(pedido.attribution),
      assist_surfaces: pedido.attribution?.assists ?? [],
      last_assist: pedido.attribution?.lastAssist ?? null,
      assist_touch_count: pedido.attribution?.touchCount ?? 0,
    },
  );

  return NextResponse.json({ pago });
}
