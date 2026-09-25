import {
  summarizeContextualCommerceLearning,
  type ContextualLearningOrder,
} from "./contextual-learning-core";
import type { ContextualBanditArm } from "./contextual-bandit-core";

export type ContextualBanditMetricEvent = {
  tipo: string;
  sessionId: string;
  productSlug: string | null;
  intent: string | null;
  createdAt: Date;
};

export type ContextualBanditArmMetrics = {
  arm: ContextualBanditArm;
  exposures: number;
  accepted: number;
  addRatePct: number;
  matchedPaidOrders: number;
  paidMatchRatePct: number;
  matchedProductRevenueCop: number;
};

export type ContextualBanditMetrics = {
  totalExposures: number;
  explorationSharePct: number;
  holdoutSharePct: number;
  arms: ContextualBanditArmMetrics[];
};

const ARM_INTENT: Record<ContextualBanditArm, string> = {
  EXPLOIT: "bandit_exploit",
  EXPLORE: "bandit_explore",
  HOLDOUT: "bandit_holdout",
};

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function summarizeContextualBanditMetrics(
  events: ContextualBanditMetricEvent[],
  orders: ContextualLearningOrder[],
): ContextualBanditMetrics {
  const arms = (["EXPLOIT", "EXPLORE", "HOLDOUT"] as const).map((arm) => {
    const summary = summarizeContextualCommerceLearning(
      events
        .filter((event) => event.intent === ARM_INTENT[arm])
        .map((event) => ({
          tipo: event.tipo,
          sessionId: event.sessionId,
          productSlug: event.productSlug,
          createdAt: event.createdAt,
        })),
      orders,
    );

    return {
      arm,
      exposures: summary.exposures,
      accepted: summary.accepted,
      addRatePct: summary.addRatePct,
      matchedPaidOrders: summary.matchedPaidOrders,
      paidMatchRatePct: summary.paidMatchRatePct,
      matchedProductRevenueCop: summary.matchedProductRevenueCop,
    };
  });

  const totalExposures = arms.reduce((sum, arm) => sum + arm.exposures, 0);
  const explore = arms.find((arm) => arm.arm === "EXPLORE");
  const holdout = arms.find((arm) => arm.arm === "HOLDOUT");

  return {
    totalExposures,
    explorationSharePct: pct(explore?.exposures ?? 0, totalExposures),
    holdoutSharePct: pct(holdout?.exposures ?? 0, totalExposures),
    arms,
  };
}
