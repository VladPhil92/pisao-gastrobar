import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateDaysOfCover,
  calculateRecipeCost,
  calculateRecipeInventoryRisk,
} from "@/lib/inventory/core";
import { InventoryIntelligenceManager } from "@/components/admin/InventoryIntelligenceManager";

const WINDOW_DAYS = 14;

async function loadInventoryData() {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [ingredients, products, deliveredOrders] = await Promise.all([
    prisma.inventarioInsumo.findMany({
      orderBy: [{ activo: "desc" }, { nombre: "asc" }],
      include: {
        _count: { select: { recetas: true } },
      },
    }),
    prisma.producto.findMany({
      orderBy: [{ categoria: { orden: "asc" } }, { orden: "asc" }, { nombre: "asc" }],
      include: {
        categoria: { select: { nombre: true } },
        recetaInsumos: {
          include: { insumo: true },
          orderBy: { insumo: { nombre: "asc" } },
        },
      },
    }),
    prisma.pedido.findMany({
      where: {
        estado: "ENTREGADO",
        entregadoAt: { gte: since },
      },
      select: {
        items: {
          select: {
            productoId: true,
            cantidad: true,
          },
        },
      },
    }),
  ]);

  const soldUnits = new Map<string, number>();
  for (const order of deliveredOrders) {
    for (const item of order.items) {
      soldUnits.set(
        item.productoId,
        (soldUnits.get(item.productoId) ?? 0) + item.cantidad,
      );
    }
  }

  const theoreticalUsage = new Map<string, number>();
  for (const product of products) {
    const units = soldUnits.get(product.id) ?? 0;
    if (units <= 0) continue;

    for (const line of product.recetaInsumos) {
      const quantity =
        Number(line.cantidadBase) * (1 + Number(line.mermaPct) / 100);
      theoreticalUsage.set(
        line.insumoId,
        (theoreticalUsage.get(line.insumoId) ?? 0) + quantity * units,
      );
    }
  }

  const ingredientRows = ingredients.map((ingredient) => {
    const usage = theoreticalUsage.get(ingredient.id) ?? 0;
    const averageDailyConsumption = usage / WINDOW_DAYS;
    return {
      id: ingredient.id,
      nombre: ingredient.nombre,
      unidadBase: ingredient.unidadBase,
      stockActual: Number(ingredient.stockActual),
      stockMinimo: Number(ingredient.stockMinimo),
      costoUnidadBase:
        ingredient.costoUnidadBase === null
          ? null
          : Number(ingredient.costoUnidadBase),
      costoCompraReferencia:
        ingredient.costoCompraReferencia === null
          ? null
          : Number(ingredient.costoCompraReferencia),
      cantidadCompraReferencia:
        ingredient.cantidadCompraReferencia === null
          ? null
          : Number(ingredient.cantidadCompraReferencia),
      activo: ingredient.activo,
      ultimaRevisionAt: ingredient.ultimaRevisionAt?.toISOString() ?? null,
      recipeCount: ingredient._count.recetas,
      theoreticalUsage14d: Number(usage.toFixed(3)),
      averageDailyConsumption: Number(averageDailyConsumption.toFixed(3)),
      daysOfCover: calculateDaysOfCover(
        Number(ingredient.stockActual),
        averageDailyConsumption,
      ),
    };
  });

  const productRows = products.map((product) => {
    const lines = product.recetaInsumos.map((line) => ({
      ingredientId: line.insumo.id,
      quantityBase: Number(line.cantidadBase),
      wastePct: Number(line.mermaPct),
      unitCost:
        line.insumo.costoUnidadBase === null
          ? null
          : Number(line.insumo.costoUnidadBase),
      stock: Number(line.insumo.stockActual),
      minimumStock: Number(line.insumo.stockMinimo),
      active: line.insumo.activo,
    }));
    const cost = calculateRecipeCost(lines);
    const risk = calculateRecipeInventoryRisk(lines);

    return {
      id: product.id,
      nombre: product.nombre,
      categoria: product.categoria.nombre,
      precio: Number(product.precio),
      costoUnitario:
        product.costoUnitario === null ? null : Number(product.costoUnitario),
      inventarioBajoManual: product.inventarioBajo,
      inventarioBajoReceta: product.inventarioBajoReceta,
      theoreticalCost: cost.theoreticalCost,
      costComplete: cost.complete,
      costCoverage:
        cost.totalLines > 0
          ? Math.round((cost.configuredLines / cost.totalLines) * 100)
          : 0,
      estimatedPortions: risk.estimatedPortions,
      recipeLow: risk.low,
      recipeBlocked: risk.blocked,
      soldUnits14d: soldUnits.get(product.id) ?? 0,
      recipe: product.recetaInsumos.map((line) => ({
        insumoId: line.insumoId,
        cantidadBase: Number(line.cantidadBase),
        mermaPct: Number(line.mermaPct),
      })),
    };
  });

  return {
    ingredients: ingredientRows,
    products: productRows,
    windowDays: WINDOW_DAYS,
  };
}

export default async function InventoryPage() {
  const session = await auth();
  const user = session?.user as { rol?: string } | undefined;
  if (!session?.user || user?.!["SUPER_ADMIN", "ADMIN"].includes(rol ?? "")) {
    redirect("/admin/dashboard");
  }

  const data = await loadInventoryData();

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pisao-gold">
          Recipe & Inventory Intelligence V6
        </p>
        <h1 className="font-display mt-2 text-4xl text-pisao-cream">
          Insumos, recetas y cobertura operativa
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-relaxed text-pisao-cream-muted">
          El stock real cambia únicamente con movimientos administrativos
          auditables. Las recetas calculan costo teórico, merma, porciones
          posibles y consumo observado de los últimos {data.windowDays} días
          sin descontar inventario silenciosamente.
        </p>
      </div>

      <InventoryIntelligenceManager {...data} />
    </div>
  );
}
