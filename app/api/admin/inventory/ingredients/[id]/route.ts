import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { calculateUnitCostFromPurchase } from "@/lib/inventory/core";
import { recomputeRecipeRiskForIngredient } from "@/lib/inventory/service";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";


export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  if (!user?.id || user.rol !== "ADMIN") {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    nombre?: string;
    stockMinimo?: number;
    activo?: boolean;
    costoCompraReferencia?: number | null;
    cantidadCompraReferencia?: number | null;
  };

  const data: Prisma.InventarioInsumoUpdateInput = {};

  if (body.nombre !== undefined) {
    const nombre = body.nombre.trim().slice(0, 120);
    if (!nombre) {
      return Response.json({ error: "Nombre inválido." }, { status: 400 });
    }
    data.nombre = nombre;
  }


  if (body.stockMinimo !== undefined) {
    if (!Number.isFinite(body.stockMinimo) || body.stockMinimo < 0) {
      return Response.json({ error: "Stock mínimo inválido." }, { status: 400 });
    }
    data.stockMinimo = body.stockMinimo;
  }

  if (body.activo !== undefined) data.activo = body.activo;

  if (
    body.costoCompraReferencia !== undefined ||
    body.cantidadCompraReferencia !== undefined
  ) {
    const purchaseCost = body.costoCompraReferencia ?? null;
    const purchaseQuantity = body.cantidadCompraReferencia ?? null;

    if (purchaseCost === null && purchaseQuantity === null) {
      data.costoCompraReferencia = null;
      data.cantidadCompraReferencia = null;
      data.costoUnidadBase = null;
    } else {
      const unitCost = calculateUnitCostFromPurchase(
        purchaseCost,
        purchaseQuantity,
      );
      if (unitCost === null) {
        return Response.json(
          { error: "Costo y cantidad de compra deben ser positivos." },
          { status: 400 },
        );
      }
      data.costoCompraReferencia = purchaseCost;
      data.cantidadCompraReferencia = purchaseQuantity;
      data.costoUnidadBase = unitCost;
    }
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Sin cambios." }, { status: 400 });
  }

  try {
    const updated = await prisma.inventarioInsumo.update({
      where: { id },
      data,
    });

    const affected = await recomputeRecipeRiskForIngredient(id);

    void emitKevGovernanceEvent("pisao.inventory.ingredient_updated", {
      source: "inventory_v6",
      ingredient_ref: governanceRef(id),
      active: updated.activo,
      cost_configured: updated.costoUnidadBase !== null,
      affected_products: affected.length,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("[PISAO INVENTORY] update ingredient", error);
    return Response.json(
      { error: "No fue posible actualizar el insumo." },
      { status: 500 },
    );
  }
}
