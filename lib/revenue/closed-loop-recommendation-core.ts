export const CLOSED_LOOP_RECOMMENDATION_VERSION =
  "closed_loop_recommendations_v20";

export const CLOSED_LOOP_MIN_EXPOSURES = 12;
export const CLOSED_LOOP_MAX_ABS_ADJUSTMENT = 8;

export type ClosedLoopSignal = {
  productSlug: string;
  exposures: number;
  accepted: number;
  addRatePct: number;
  matchedPaidOrders: number;
  paidMatchRatePct: number;
};

export type ClosedLoopAdjustment = {
  eligible: boolean;
  adjustment: number;
  exposures: number;
  addRatePct: number;
  paidMatchRatePct: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function finitePct(value: number) {
  if (!Number.isFinite(value)) return 0;
  return clamp(value, 0, 100);
}

function finiteCount(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

export function closedLoopAdjustment(
  signal: ClosedLoopSignal | undefined,
): ClosedLoopAdjustment {
  if (!signal) {
    return {
      eligible: false,
      adjustment: 0,
      exposures: 0,
      addRatePct: 0,
      paidMatchRatePct: 0,
    };
  }

  const exposures = finiteCount(signal.exposures);
  const addRatePct = finitePct(signal.addRatePct);
  const paidMatchRatePct = finitePct(signal.paidMatchRatePct);

  if (exposures < CLOSED_LOOP_MIN_EXPOSURES) {
    return {
      eligible: false,
      adjustment: 0,
      exposures,
      addRatePct,
      paidMatchRatePct,
    };
  }

  // Shrink sparse evidence toward neutral behavior to avoid overreacting.
  const confidence = exposures / (exposures + 24);
  const addDelta = (addRatePct - 20) / 10;
  const paidDelta = (paidMatchRatePct - 8) / 5;
  const raw = (addDelta * 3 + paidDelta * 3) * confidence;

  return {
    eligible: true,
    adjustment:
      Math.round(
        clamp(
          raw,
          -CLOSED_LOOP_MAX_ABS_ADJUSTMENT,
          CLOSED_LOOP_MAX_ABS_ADJUSTMENT,
        ) * 100,
      ) / 100,
    exposures,
    addRatePct,
    paidMatchRatePct,
  };
}
