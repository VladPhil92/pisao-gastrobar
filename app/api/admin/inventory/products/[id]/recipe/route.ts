import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import {
  getRecipeEconomics,
  recomputeRecipeRiskForProducts,
} from "@/lib/inventory/service";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  if (!user?.id || !["SUPER_ADMIN", "ADMIN"].includes(user.rol ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id: productoId } = await params;
  const body = (await request.json()) as {
    items?: Array<{
      insumoId?: string;
      cantidadBase?: number;
      mermaPct?: number;
    }>;
  };
  const items = Array.isArray(body.items) ? body.items : [];

  if (items.length > 80) {
    return Response.json({ error: "Receta demasiado extensa." }, { status: 400 });
  }

  const normalized = items.map((item) => ({
    insumoId: item.insumoId?.trim() ?? "",
    cantidadBase: Number(item.cantidadBase),
    mermaPct: Number(item.mermaPct ?? 0),
  }));

  if (
    normalized.some(
      (item) =>
        !item.insumoId ||
        !Number.isFinite(item.cantidadBase) ||
        item.cantidadBase <= 0 ||
        !Number.isFinite(item.mermaPct) ||
        item.mermaPct < 0 ||
        item.mermaPct > 100,
    )
  ) {
    return Response.json({ error: "Líneas de receta inválidas." }, { status: 400 });
  }

  if (new Set(normalized.map((item) => item.insumoId)).size !== normalized.length) {
    return Response.json(
      { error: "Un insumo no puede aparecer dos veces en la misma receta." },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.producto.findUnique({
        where: { id: productoId },
        select: { id: true },
      });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      if (normalized.length) {
        const ingredients = await tx.inventarioInsumo.count({
          where: { id: { in: normalized.map((item) => item.insumoId) } },
        });
        if (ingredients !== normalized.length) {
          throw new Error("INGREDIENT_NOT_FOUND");
        }
      }

      await tx.recetaInsumo.deleteMany({ where: { productoId } });
      if (normalized.length) {
        await tx.recetaInsumo.createMany({
          data: normalized.map((item) => ({
            productoId,
            insumoId: item.insumoId,
            cantidadBase: item.cantidadBase,
            mermaPct: item.mermaPct,
          })),
        });
      }
    });

    await recomputeRecipeRiskForProducts([productoId]);
    const economics = await getRecipeEconomics(productoId);

    void emitKevGovernanceEvent("pisao.inventory.recipe_updated", {
      source: "inventory_v6",
      product_ref: governanceRef(productoId),
      recipe_lines: normalized.length,
      cost_complete: economics?.cost.complete ?? false,
      recipe_low: economics?.risk.low ?? false,
      recipe_blocked: economics?.risk.blocked ?? false,
    });

    return Response.json({
      ok: true,
      economics: economics
        ? {
            theoreticalCost: economics.cost.theoreticalCost,
            costComplete: economics.cost.complete,
            estimatedPortions: economics.risk.estimatedPortions,
            low: economics.risk.low,
            blocked: economics.risk.blocked,
          }
        : null,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (code === "PRODUCT_NOT_FOUND" || code === "INGREDIENT_NOT_FOUND") {
      return Response.json(
        {
          error:
            code === "PRODUCT_NOT_FOUND"
              ? "Producto no encontrado."
              : "Uno de los insumos no existe.",
        },
        { status: 404 },
      );
    }
    console.error("[PISAO INVENTORY] update recipe", error);
    return Response.json(
      { error: "No fue posible guardar la receta." },
      { status: 500 },
    );
  }
}
