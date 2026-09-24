import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RESERVABLE_TABLE_SEATS } from "@/lib/reservas/policy";

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= 10 &&
    value.every(
      (item) => typeof item === "string" && item.trim().length <= 40,
    )
  );
}

export async function PATCH(request: Request) {
  const session = await auth();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(rol ?? "")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const codigo = typeof body.codigo === "string" ? body.codigo.trim() : "";
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const zona = typeof body.zona === "string" ? body.zona.trim() : "";
    const capacidad = Number(body.capacidad);
    const prioridad = Number(body.prioridad);
    const activa = body.activa;
    const atributos = body.atributos;
    const posX = Number(body.posX);
    const posY = Number(body.posY);

    if (!/^T[1-8]$/.test(codigo)) {
      return NextResponse.json(
        { error: "Código de mesa inválido." },
        { status: 400 },
      );
    }

    if (!nombre || nombre.length > 80 || !zona || zona.length > 80) {
      return NextResponse.json(
        { error: "Nombre o zona inválidos." },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(capacidad) ||
      capacidad !== RESERVABLE_TABLE_SEATS ||
      !Number.isInteger(prioridad) ||
      prioridad < 0 ||
      prioridad > 1000 ||
      !Number.isInteger(posX) ||
      posX < 0 ||
      posX > 20 ||
      !Number.isInteger(posY) ||
      posY < 0 ||
      posY > 20
    ) {
      return NextResponse.json(
        { error: `Cada mesa reservable de PISÁO debe conservar ${RESERVABLE_TABLE_SEATS} puestos.` },
        { status: 400 },
      );
    }

    if (
      typeof activa !== "boolean" ||
      !isStringArray(atributos)
    ) {
      return NextResponse.json(
        { error: "Configuración de mesa inválida." },
        { status: 400 },
      );
    }

    const table = await prisma.mesaReservable.update({
      where: { codigo },
      data: {
        nombre,
        capacidad,
        zona,
        prioridad,
        combinable: true,
        activa,
        atributos: atributos
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 10),
        posX,
        posY,
      },
    });

    return NextResponse.json({ table });
  } catch (error) {
    console.error("[PISAO ADMIN] Error actualizando mesa reservable", error);
    return NextResponse.json(
      { error: "No fue posible actualizar la mesa." },
      { status: 503 },
    );
  }
}
