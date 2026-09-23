import { NextResponse } from "next/server";
import { crearPedidoSchema } from "@/lib/orders/schema";
import { crearPedido } from "@/lib/orders/create-order";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = crearPedidoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const baseUrl = new URL(request.url).origin;
  const resultado = await crearPedido(parsed.data, baseUrl);

  void emitKevGovernanceEvent("pisao.order.created", {
    order_ref: governanceRef(resultado.pedido.id),
    source: "order_api",
    total: Number(resultado.pedido.total),
    item_count: parsed.data.items.reduce(
      (sum, item) => sum + item.cantidad,
      0,
    ),
    tipo_entrega: parsed.data.tipoEntrega,
    metodo_pago: parsed.data.metodoPago,
    estado: resultado.pedido.estado,
  });

  return NextResponse.json(resultado, { status: 201 });
}
