export type RecipeLineInput = {
  ingredientId: string;
  quantityBase: number;
  wastePct: number;
  unitCost: number | null;
  stock: number;
  minimumStock: number;
  active: boolean;
};

export type RecipeCost = {
  complete: boolean;
  configuredLines: number;
  totalLines: number;
  partialCost: number;
  theoreticalCost: number | null;
};

export type RecipeInventoryRisk = {
  configured: boolean;
  low: boolean;
  blocked: boolean;
  estimatedPortions: number | null;
  criticalIngredientId: string | null;
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function effectiveRecipeQuantity(
  quantityBase: number,
  wastePct: number,
) {
  const quantity = Math.max(0, quantityBase);
  const waste = Math.max(0, Math.min(100, wastePct));
  // Normalize floating-point noise while preserving more precision than
  // the persisted recipe quantity (3 decimals) and waste percentage (2 decimals).
  return round(quantity * (1 + waste / 100), 6);
}

export function calculateRecipeCost(lines: RecipeLineInput[]): RecipeCost {
  if (lines.length === 0) {
    return {
      complete: false,
      configuredLines: 0,
      totalLines: 0,
      partialCost: 0,
      theoreticalCost: null,
    };
  }

  let configuredLines = 0;
  let partialCost = 0;

  for (const line of lines) {
    if (
      line.unitCost === null ||
      !Number.isFinite(line.unitCost) ||
      line.unitCost < 0
    ) {
      continue;
    }

    configuredLines += 1;
    partialCost +=
      effectiveRecipeQuantity(line.quantityBase, line.wastePct) * line.unitCost;
  }

  const complete = configuredLines === lines.length;

  return {
    complete,
    configuredLines,
    totalLines: lines.length,
    partialCost: round(partialCost),
    theoreticalCost: complete ? round(partialCost) : null,
  };
}

export function calculateRecipeInventoryRisk(
  lines: RecipeLineInput[],
): RecipeInventoryRisk {
  if (lines.length === 0) {
    return {
      configured: false,
      low: false,
      blocked: false,
      estimatedPortions: null,
      criticalIngredientId: null,
    };
  }

  let minPortions = Number.POSITIVE_INFINITY;
  let criticalIngredientId: string | null = null;
  let low = false;
  let blocked = false;

  for (const line of lines) {
    const effectiveQuantity = effectiveRecipeQuantity(
      line.quantityBase,
      line.wastePct,
    );

    if (!line.active || effectiveQuantity <= 0) {
      blocked = true;
      criticalIngredientId ??= line.ingredientId;
      minPortions = 0;
      continue;
    }

    const stock = Math.max(0, line.stock);
    const portions = Math.floor(stock / effectiveQuantity);

    if (portions < minPortions) {
      minPortions = portions;
      criticalIngredientId = line.ingredientId;
    }

    if (stock <= 0) {
      blocked = true;
    }
    if (stock <= Math.max(0, line.minimumStock)) {
      low = true;
    }
  }

  if (blocked) low = true;

  return {
    configured: true,
    low,
    blocked,
    estimatedPortions: Number.isFinite(minPortions) ? minPortions : null,
    criticalIngredientId,
  };
}

export function calculateDaysOfCover(
  currentStock: number,
  averageDailyConsumption: number,
) {
  const stock = Math.max(0, currentStock);
  const demand = Math.max(0, averageDailyConsumption);
  if (demand <= 0) return null;
  return round(stock / demand, 1);
}

export function calculateUnitCostFromPurchase(
  purchaseCost: number | null,
  purchaseQuantityBase: number | null,
) {
  if (
    purchaseCost === null ||
    purchaseQuantityBase === null ||
    !Number.isFinite(purchaseCost) ||
    !Number.isFinite(purchaseQuantityBase) ||
    purchaseCost < 0 ||
    purchaseQuantityBase <= 0
  ) {
    return null;
  }

  return round(purchaseCost / purchaseQuantityBase, 4);
}
