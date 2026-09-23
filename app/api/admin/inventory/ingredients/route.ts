import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { calculateUnitCostFromPurchase } from "@/lib/inventory/core";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";

const UNITS = new Set(["GRAMO", "MILILITRO", "UNIDAD"]);

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  if (!user?.id || user.rol !== "ADMIN") {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    nombre?: string;
    unidadBase?: string;
    stockActual?: number;
    stockMinimo?: number;
    costoCompraReferencia?: number | null;
    cantidadCompraReferencia?: number | null;
  };

  const nombre = body.nombre?.trim().slice(0, 120) ?? "";
  if (!nombre || !UNITS.has(body.unidadBase ?? "")) {
    return Response.json(
      { error: "Nombre y unidad base válidos son obligatorios." },
      { status: 400 },
    );
  }

  const stockActual = Number(body.stockActual ?? 0);
  const stockMinimo = Number(body.stockMinimo ?? 0);
  if (
    !Number.isFinite(stockActual) ||
    stockActual < 0 ||
    !Number.isFinite(stockMinimo) ||
    stockMinimo < 0
  ) {
    return Response.json({ error: "Stock inválido." }, { status: 400 });
  }

  const purchaseCost =
    body.costoCompraReferencia === undefined
      ? null
      : body.costoCompraReferencia;
  const purchaseQuantity =
    body.cantidadCompraReferencia === undefined
      ? null
      : body.cantidadCompraReferencia;
  const unitCost = calculateUnitCostFromPurchase(
    purchaseCost ?? null,
    purchaseQuantity ?? null,
  );

  if (
    (purchaseCost !== null || purchaseQuantity !== null) &&
    unitCost === null
  ) {
    return Response.json(
      { error: "Costo y cantidad de compra deben ser positivos y completos." },
      { status: 400 },
    );
  }

  try {
    const ingredient = await prisma.$transaction(async (tx) => {
      const created = await tx.inventarioInsumo.create({
        data: {
          nombre,
          unidadBase: body.unidadBase as "GRAMO" | "MILILITRO" | "UNIDAD",
          stockActual,
          stockMinimo,
          costoUnidadBase: unitCost,
          costoCompraReferencia: purchaseCost,
          cantidadCompraReferencia: purchaseQuantity,
          ultimaRevisionAt: stockActual > 0 ? new Date() : null,
        },
      });

      if (stockActual > 0) {
        await tx.movimientoInventario.create({
          data: {
            insumoId: created.id,
            tipo: "CONTEO",
            delta: stockActual,
            stockAnterior: 0,
            stockPosterior: stockActual,
            motivo: "Stock inicial",
            usuarioId: user.id!,
          },
        });
      }

      return created;
    });

    void emitKevGovernanceEvent("pisao.inventory.ingredient_created", {
      source: "inventory_v6",
      ingredient_ref: governanceRef(ingredient.id),
      unit: ingredient.unidadBase,
      stock_configured: stockActual > 0,
      cost_configured: unitCost !== null,
    });

    return Response.json({ ok: true, id: ingredient.id });
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: string }).code)
        : "";
    if (code === "P2002") {
      return Response.json(
        { error: "Ya existe un insumo con ese nombre." },
        { status: 409 },
      );
    }
    console.error("[PISAO INVENTORY] create ingredient", error);
    return Response.json(
      { error: "No fue posible crear el insumo." },
      { status: 500 },
    );
  }
}
