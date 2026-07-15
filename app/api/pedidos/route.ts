import { NextResponse } from "next/server";
import { crearPedidoSchema } from "@/lib/orders/schema";
import { crearPedido } from "@/lib/orders/create-order";

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

  return NextResponse.json(resultado, { status: 201 });
}
