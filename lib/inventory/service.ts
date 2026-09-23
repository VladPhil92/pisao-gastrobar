import "server-only";

import { prisma } from "@/lib/prisma";
import {
  calculateRecipeCost,
  calculateRecipeInventoryRisk,
  type RecipeLineInput,
} from "@/lib/inventory/core";

function toLineInput(line: {
  cantidadBase: { toString(): string };
  mermaPct: { toString(): string };
  insumo: {
    id: string;
    costoUnidadBase: { toString(): string } | null;
    stockActual: { toString(): string };
    stockMinimo: { toString(): string };
    activo: boolean;
  };
}): RecipeLineInput {
  return {
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
  };
}

export async function recomputeRecipeRiskForProducts(productIds: string[]) {
  const ids = [...new Set(productIds.filter(Boolean))];
  if (ids.length === 0) return [];

  const products = await prisma.producto.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      recetaInsumos: {
        select: {
          cantidadBase: true,
          mermaPct: true,
          insumo: {
            select: {
              id: true,
              costoUnidadBase: true,
              stockActual: true,
              stockMinimo: true,
              activo: true,
            },
          },
        },
      },
    },
  });

  const results = products.map((product) => {
    const lines = product.recetaInsumos.map(toLineInput);
    const risk = calculateRecipeInventoryRisk(lines);
    const cost = calculateRecipeCost(lines);
    return {
      productId: product.id,
      low: risk.configured ? risk.low : false,
      blocked: risk.configured ? risk.blocked : false,
      estimatedPortions: risk.estimatedPortions,
      theoreticalCost: cost.theoreticalCost,
      costComplete: cost.complete,
    };
  });

  await prisma.$transaction(
    results.map((result) =>
      prisma.producto.update({
        where: { id: result.productId },
        data: { inventarioBajoReceta: result.low },
      }),
    ),
  );

  return results;
}

export async function recomputeRecipeRiskForIngredient(insumoId: string) {
  const links = await prisma.recetaInsumo.findMany({
    where: { insumoId },
    select: { productoId: true },
  });
  return recomputeRecipeRiskForProducts(links.map((link) => link.productoId));
}

export async function getRecipeEconomics(productId: string) {
  const product = await prisma.producto.findUnique({
    where: { id: productId },
    select: {
      id: true,
      precio: true,
      costoUnitario: true,
      inventarioBajo: true,
      inventarioBajoReceta: true,
      recetaInsumos: {
        orderBy: { insumo: { nombre: "asc" } },
        select: {
          id: true,
          cantidadBase: true,
          mermaPct: true,
          insumo: {
            select: {
              id: true,
              nombre: true,
              unidadBase: true,
              costoUnidadBase: true,
              stockActual: true,
              stockMinimo: true,
              activo: true,
            },
          },
        },
      },
    },
  });

  if (!product) return null;

  const lines = product.recetaInsumos.map(toLineInput);
  return {
    product,
    cost: calculateRecipeCost(lines),
    risk: calculateRecipeInventoryRisk(lines),
  };
}
