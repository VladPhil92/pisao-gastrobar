export const CONTEXTUAL_LEARNING_VERSION = "contextual_learning_v19";
export const CONTEXTUAL_OUTCOME_WINDOW_MS = 12 * 60 * 60 * 1000;

export type ContextualLearningEvent = {
  tipo: string;
  sessionId: string;
  productSlug: string | null;
  createdAt: Date;
};

export type ContextualLearningOrder = {
  id: string;
  sessionId: string | null;
  createdAt: Date;
  items: Array<{
    productSlug: string;
    quantity: number;
    subtotalCop: number;
  }>;
};

export type ContextualProductLearning = {
  productSlug: string;
  exposures: number;
  accepted: number;
  addRatePct: number;
  matchedPaidOrders: number;
  matchedPaidUnits: number;
  matchedProductRevenueCop: number;
  paidMatchRatePct: number;
};

export type ContextualLearningSummary = {
  version: typeof CONTEXTUAL_LEARNING_VERSION;
  exposures: number;
  accepted: number;
  addRatePct: number;
  matchedPaidOrders: number;
  matchedPaidUnits: number;
  matchedProductRevenueCop: number;
  paidMatchRatePct: number;
  products: ContextualProductLearning[];
};

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function pairKey(sessionId: string, productSlug: string) {
  return `${sessionId}|${productSlug}`;
}

function finiteNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function validSlug(value: string | null): value is string {
  return Boolean(value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value));
}

export function summarizeContextualCommerceLearning(
  events: ContextualLearningEvent[],
  orders: ContextualLearningOrder[],
): ContextualLearningSummary {
  const orderedEvents = [...events].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const exposureAt = new Map<string, Date>();
  const acceptedPairs = new Set<string>();

  for (const event of orderedEvents) {
    if (!validSlug(event.productSlug) || !event.sessionId) continue;
    const key = pairKey(event.sessionId, event.productSlug);

    if (event.tipo === "concierge_nba_view") {
      const existing = exposureAt.get(key);
      if (!existing || event.createdAt < existing) {
        exposureAt.set(key, event.createdAt);
      }
      continue;
    }

    if (event.tipo !== "concierge_nba_add") continue;

    const exposure = exposureAt.get(key);
    if (!exposure) continue;

    const delta = event.createdAt.getTime() - exposure.getTime();
    if (delta >= 0 && delta <= CONTEXTUAL_OUTCOME_WINDOW_MS) {
      acceptedPairs.add(key);
    }
  }

  const perProduct = new Map<
    string,
    {
      exposures: Set<string>;
      accepted: Set<string>;
      paidOrderIds: Set<string>;
      paidSessions: Set<string>;
      paidUnits: number;
      revenue: number;
    }
  >();

  for (const key of exposureAt.keys()) {
    const separator = key.indexOf("|");
    const sessionId = key.slice(0, separator);
    const productSlug = key.slice(separator + 1);
    const current = perProduct.get(productSlug) ?? {
      exposures: new Set<string>(),
      accepted: new Set<string>(),
      paidOrderIds: new Set<string>(),
      paidSessions: new Set<string>(),
      paidUnits: 0,
      revenue: 0,
    };
    current.exposures.add(sessionId);
    if (acceptedPairs.has(key)) current.accepted.add(sessionId);
    perProduct.set(productSlug, current);
  }

  const matchedOrderIds = new Set<string>();
  const matchedPairs = new Set<string>();
  let matchedPaidUnits = 0;
  let matchedProductRevenueCop = 0;

  for (const order of orders) {
    if (!order.sessionId) continue;

    for (const item of order.items) {
      if (!validSlug(item.productSlug)) continue;

      const key = pairKey(order.sessionId, item.productSlug);
      const exposure = exposureAt.get(key);
      if (!exposure) continue;

      const delta = order.createdAt.getTime() - exposure.getTime();
      if (delta < 0 || delta > CONTEXTUAL_OUTCOME_WINDOW_MS) continue;

      const current = perProduct.get(item.productSlug);
      if (!current) continue;

      const quantity = Math.max(0, Math.floor(finiteNonNegative(item.quantity)));
      const subtotalCop = finiteNonNegative(item.subtotalCop);

      current.paidOrderIds.add(order.id);
      current.paidSessions.add(order.sessionId);
      current.paidUnits += quantity;
      current.revenue += subtotalCop;
      matchedOrderIds.add(order.id);
      matchedPairs.add(key);
      matchedPaidUnits += quantity;
      matchedProductRevenueCop += subtotalCop;
    }
  }

  const products = [...perProduct.entries()]
    .map(([productSlug, value]) => ({
      productSlug,
      exposures: value.exposures.size,
      accepted: value.accepted.size,
      addRatePct: pct(value.accepted.size, value.exposures.size),
      matchedPaidOrders: value.paidOrderIds.size,
      matchedPaidUnits: value.paidUnits,
      matchedProductRevenueCop: Math.round(value.revenue),
      paidMatchRatePct: pct(value.paidSessions.size, value.exposures.size),
    }))
    .sort(
      (a, b) =>
        b.matchedPaidOrders - a.matchedPaidOrders ||
        b.accepted - a.accepted ||
        b.exposures - a.exposures ||
        a.productSlug.localeCompare(b.productSlug),
    );

  const exposures = exposureAt.size;
  const accepted = acceptedPairs.size;

  return {
    version: CONTEXTUAL_LEARNING_VERSION,
    exposures,
    accepted,
    addRatePct: pct(accepted, exposures),
    matchedPaidOrders: matchedOrderIds.size,
    matchedPaidUnits,
    matchedProductRevenueCop: Math.round(matchedProductRevenueCop),
    paidMatchRatePct: pct(matchedPairs.size, exposures),
    products,
  };
}
