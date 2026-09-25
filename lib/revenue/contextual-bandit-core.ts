export const CONTEXTUAL_BANDIT_VERSION = "contextual_bandit_v21";
export const CONTEXTUAL_BANDIT_EXPLORE_PCT = 10;
export const CONTEXTUAL_BANDIT_HOLDOUT_PCT = 10;
export const CONTEXTUAL_BANDIT_MAX_SCORE_GAP = 6;
export const CONTEXTUAL_BANDIT_MAX_POOL = 3;

export type ContextualBanditArm = "EXPLOIT" | "EXPLORE" | "HOLDOUT";

export type ContextualBanditCandidate = {
  productSlug: string;
  score: number;
  exposures: number;
};

export type ContextualBanditDecision = {
  version: typeof CONTEXTUAL_BANDIT_VERSION;
  arm: ContextualBanditArm;
  selectedSlug: string | null;
  explored: boolean;
  eligiblePoolSize: number;
  reason:
    | "no_candidates"
    | "session_unavailable"
    | "exploration_disabled"
    | "exploit"
    | "holdout"
    | "no_safe_alternative"
    | "bounded_exploration";
};

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function validSessionId(value: string | undefined) {
  return Boolean(
    value &&
      value.length >= 8 &&
      value.length <= 64 &&
      /^[A-Za-z0-9_-]+$/.test(value),
  );
}

function finiteScore(value: number) {
  return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
}

function finiteExposures(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export function assignContextualBanditArm(
  sessionId: string | undefined,
): ContextualBanditArm {
  if (!validSessionId(sessionId)) return "EXPLOIT";

  const bucket =
    stableHash(`${CONTEXTUAL_BANDIT_VERSION}:${sessionId}`) % 100;

  if (bucket < CONTEXTUAL_BANDIT_EXPLORE_PCT) return "EXPLORE";
  if (
    bucket <
    CONTEXTUAL_BANDIT_EXPLORE_PCT + CONTEXTUAL_BANDIT_HOLDOUT_PCT
  ) {
    return "HOLDOUT";
  }
  return "EXPLOIT";
}

export function selectContextualBanditCandidate(params: {
  sessionId?: string;
  allowExploration: boolean;
  candidates: ContextualBanditCandidate[];
}): ContextualBanditDecision {
  const candidates = params.candidates
    .filter((candidate) => candidate.productSlug.trim())
    .map((candidate, index) => ({
      productSlug: candidate.productSlug,
      score: finiteScore(candidate.score),
      exposures: finiteExposures(candidate.exposures),
      index,
    }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const top = candidates[0];
  if (!top) {
    return {
      version: CONTEXTUAL_BANDIT_VERSION,
      arm: "EXPLOIT",
      selectedSlug: null,
      explored: false,
      eligiblePoolSize: 0,
      reason: "no_candidates",
    };
  }

  if (!validSessionId(params.sessionId)) {
    return {
      version: CONTEXTUAL_BANDIT_VERSION,
      arm: "EXPLOIT",
      selectedSlug: top.productSlug,
      explored: false,
      eligiblePoolSize: 1,
      reason: "session_unavailable",
    };
  }

  const arm = assignContextualBanditArm(params.sessionId);

  if (!params.allowExploration) {
    return {
      version: CONTEXTUAL_BANDIT_VERSION,
      arm,
      selectedSlug: top.productSlug,
      explored: false,
      eligiblePoolSize: 1,
      reason: "exploration_disabled",
    };
  }

  if (arm === "EXPLOIT") {
    return {
      version: CONTEXTUAL_BANDIT_VERSION,
      arm,
      selectedSlug: top.productSlug,
      explored: false,
      eligiblePoolSize: 1,
      reason: "exploit",
    };
  }

  if (arm === "HOLDOUT") {
    return {
      version: CONTEXTUAL_BANDIT_VERSION,
      arm,
      selectedSlug: top.productSlug,
      explored: false,
      eligiblePoolSize: 1,
      reason: "holdout",
    };
  }

  const alternatives = candidates
    .slice(1)
    .filter(
      (candidate) =>
        top.score - candidate.score <= CONTEXTUAL_BANDIT_MAX_SCORE_GAP,
    )
    .sort(
      (a, b) =>
        a.exposures - b.exposures ||
        (stableHash(`${params.sessionId}:${a.productSlug}`) %
          1_000_003) -
          (stableHash(`${params.sessionId}:${b.productSlug}`) %
            1_000_003) ||
        a.productSlug.localeCompare(b.productSlug),
    )
    .slice(0, CONTEXTUAL_BANDIT_MAX_POOL);

  if (!alternatives.length) {
    return {
      version: CONTEXTUAL_BANDIT_VERSION,
      arm,
      selectedSlug: top.productSlug,
      explored: false,
      eligiblePoolSize: 1,
      reason: "no_safe_alternative",
    };
  }

  const selected = alternatives[0];
  return {
    version: CONTEXTUAL_BANDIT_VERSION,
    arm,
    selectedSlug: selected.productSlug,
    explored: selected.productSlug !== top.productSlug,
    eligiblePoolSize: alternatives.length + 1,
    reason: "bounded_exploration",
  };
}
