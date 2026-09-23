export type ProductEconomicsInput = {
  price: number;
  cost: number | null;
  available: boolean;
  lowInventory: boolean;
};

export type PairEconomics = {
  promotable: boolean;
  blockedReason: "UNAVAILABLE" | "LOW_INVENTORY" | null;
  costCoverage: "COMPLETE" | "PARTIAL";
  revenue: number;
  contribution: number | null;
  contributionMarginPct: number | null;
  profitabilityAdjustment: number;
};

export type MarginOrderItem = {
  subtotal: number;
  quantity: number;
  unitCostSnapshot: number | null;
};

export type OrderContribution = {
  costComplete: boolean;
  revenue: number;
  cost: number | null;
  contribution: number | null;
  contributionMarginPct: number | null;
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function calculatePairEconomics(
  first: ProductEconomicsInput,
  second: ProductEconomicsInput,
): PairEconomics {
  const revenue = Math.max(0, first.price) + Math.max(0, second.price);

  if (!first.available || !second.available) {
    return {
      promotable: false,
      blockedReason: "UNAVAILABLE",
      costCoverage: first.cost === null || second.cost === null ? "PARTIAL" : "COMPLETE",
      revenue: round(revenue),
      contribution: null,
      contributionMarginPct: null,
      profitabilityAdjustment: 0,
    };
  }

  if (first.lowInventory || second.lowInventory) {
    return {
      promotable: false,
      blockedReason: "LOW_INVENTORY",
      costCoverage: first.cost === null || second.cost === null ? "PARTIAL" : "COMPLETE",
      revenue: round(revenue),
      contribution: null,
      contributionMarginPct: null,
      profitabilityAdjustment: 0,
    };
  }

  if (first.cost === null || second.cost === null || revenue <= 0) {
    return {
      promotable: true,
      blockedReason: null,
      costCoverage: "PARTIAL",
      revenue: round(revenue),
      contribution: null,
      contributionMarginPct: null,
      profitabilityAdjustment: 0,
    };
  }

  const contribution = revenue - Math.max(0, first.cost) - Math.max(0, second.cost);
  const contributionMarginPct = (contribution / revenue) * 100;

  // Profitability is deliberately a modest tie-breaker. Relevance and
  // experimental lift remain the primary signals; margin never authorizes
  // changing a price or inventing a promotion.
  const profitabilityAdjustment = clamp(
    (contributionMarginPct - 45) / 3,
    -10,
    10,
  );

  return {
    promotable: true,
    blockedReason: null,
    costCoverage: "COMPLETE",
    revenue: round(revenue),
    contribution: round(contribution),
    contributionMarginPct: round(contributionMarginPct),
    profitabilityAdjustment: round(profitabilityAdjustment, 3),
  };
}

export function calculateOrderContribution(
  items: MarginOrderItem[],
): OrderContribution {
  const revenue = items.reduce((sum, item) => sum + Math.max(0, item.subtotal), 0);
  const costComplete =
    items.length > 0 &&
    items.every(
      (item) =>
        item.unitCostSnapshot !== null &&
        Number.isFinite(item.unitCostSnapshot) &&
        item.quantity > 0,
    );

  if (!costComplete || revenue <= 0) {
    return {
      costComplete,
      revenue: round(revenue),
      cost: null,
      contribution: null,
      contributionMarginPct: null,
    };
  }

  const cost = items.reduce(
    (sum, item) =>
      sum + Math.max(0, item.unitCostSnapshot ?? 0) * Math.max(0, item.quantity),
    0,
  );
  const contribution = revenue - cost;

  return {
    costComplete: true,
    revenue: round(revenue),
    cost: round(cost),
    contribution: round(contribution),
    contributionMarginPct: round((contribution / revenue) * 100),
  };
}
