export type RevenuePolicyArm = "SERVE" | "HOLDOUT";

export type PolicyAssignmentInput = {
  sessionId: string;
  arm: RevenuePolicyArm;
};

export type PolicyPaidOrderInput = {
  sessionId: string;
  total: number;
  containsTargetPair?: boolean;
  contribution?: number | null;
};

export type PolicyMetricArm = {
  assignments: number;
  convertedSessions: number;
  conversionRatePct: number;
  paidOrders: number;
  revenue: number;
  averageOrderValue: number;
  targetPairOrders: number;
  targetPairRatePct: number;
  marginKnownOrders: number;
  contribution: number;
  averageContribution: number;
  contributionMarginPct: number | null;
};

export type AdaptiveCandidate = {
  id: string;
  priorityScore: number;
  observedLiftPctPoints: number;
  productAName: string;
  productBName: string;
  profitabilityAdjustment?: number;
};

export type PolicyHealthResult = {
  sampleReady: boolean;
  minServeAssignments: number;
  minHoldoutAssignments: number;
  rollbackMarginPctPoints: number;
  serve: PolicyMetricArm;
  holdout: PolicyMetricArm;
  observedConversionLiftPctPoints: number;
  observedAovLiftPct: number | null;
  observedPairRateLiftPctPoints: number;
  conversionDifference95CiPctPoints: [number, number] | null;
  guardrail:
    | "COLLECTING"
    | "HEALTHY_OR_INCONCLUSIVE"
    | "AUTO_ROLLBACK";
};

const STOP_WORDS = new Set([
  "para",
  "con",
  "del",
  "las",
  "los",
  "una",
  "uno",
  "ale",
  "pale",
]);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function meaningfulTokens(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function relativeLift(current: number, baseline: number) {
  if (baseline <= 0) return current > 0 ? null : 0;
  return round(((current - baseline) / baseline) * 100);
}

function clampTraffic(value: number) {
  if (!Number.isFinite(value)) return 90;
  return Math.max(1, Math.min(99, Math.round(value)));
}

export function assignRevenuePolicyArm(
  policyKey: string,
  sessionId: string,
  trafficPct = 90,
): RevenuePolicyArm {
  const bucket = stableHash(`${policyKey}:${sessionId}`) % 100;
  return bucket < clampTraffic(trafficPct) ? "SERVE" : "HOLDOUT";
}

export function scoreAdaptivePairingCandidate(
  userText: string,
  candidate: AdaptiveCandidate,
) {
  const normalized = normalize(userText);
  const productATokens = meaningfulTokens(candidate.productAName);
  const productBTokens = meaningfulTokens(candidate.productBName);

  const aMatches = productATokens.filter((token) =>
    normalized.includes(token),
  ).length;
  const bMatches = productBTokens.filter((token) =>
    normalized.includes(token),
  ).length;
  const directMatches = aMatches + bMatches;

  const genericPairingIntent =
    /(recomiend|acompan|bebida|tomar|marid|combina|que pido|armame|plan para|para compartir)/.test(
      normalized,
    );

  if (!directMatches && !genericPairingIntent) return null;

  const directScore = directMatches * 120;
  const intentScore = genericPairingIntent ? 30 : 0;
  const liftScore = Math.max(
    -20,
    Math.min(40, candidate.observedLiftPctPoints * 2),
  );
  const priorityScore = Math.max(
    0,
    Math.min(100, candidate.priorityScore),
  ) * 0.2;
  const profitabilityScore = Math.max(
    -10,
    Math.min(10, candidate.profitabilityAdjustment ?? 0),
  );

  return round(
    directScore + intentScore + liftScore + priorityScore + profitabilityScore,
    3,
  );
}

export function selectAdaptivePairingCandidate(
  userText: string,
  candidates: AdaptiveCandidate[],
) {
  return candidates
    .map((candidate) => ({
      candidate,
      score: scoreAdaptivePairingCandidate(userText, candidate),
    }))
    .filter(
      (
        item,
      ): item is {
        candidate: AdaptiveCandidate;
        score: number;
      } => item.score !== null,
    )
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.candidate.observedLiftPctPoints -
          a.candidate.observedLiftPctPoints ||
        b.candidate.priorityScore - a.candidate.priorityScore ||
        a.candidate.id.localeCompare(b.candidate.id),
    )[0] ?? null;
}

function summarizeArm(
  arm: RevenuePolicyArm,
  assignments: PolicyAssignmentInput[],
  orders: PolicyPaidOrderInput[],
): PolicyMetricArm {
  const sessionIds = new Set(
    assignments.filter((item) => item.arm === arm).map((item) => item.sessionId),
  );
  const armOrders = orders.filter((order) => sessionIds.has(order.sessionId));
  const convertedSessions = new Set(armOrders.map((order) => order.sessionId));
  const revenue = armOrders.reduce((sum, order) => sum + order.total, 0);
  const targetPairOrders = armOrders.filter((order) => order.containsTargetPair).length;
  const marginOrders = armOrders.filter(
    (order) =>
      typeof order.contribution === "number" &&
      Number.isFinite(order.contribution),
  );
  const contribution = marginOrders.reduce(
    (sum, order) => sum + (order.contribution ?? 0),
    0,
  );
  const marginRevenue = marginOrders.reduce((sum, order) => sum + order.total, 0);

  return {
    assignments: sessionIds.size,
    convertedSessions: convertedSessions.size,
    conversionRatePct: sessionIds.size
      ? round((convertedSessions.size / sessionIds.size) * 100)
      : 0,
    paidOrders: armOrders.length,
    revenue: Math.round(revenue),
    averageOrderValue: armOrders.length ? Math.round(revenue / armOrders.length) : 0,
    targetPairOrders,
    targetPairRatePct: armOrders.length
      ? round((targetPairOrders / armOrders.length) * 100)
      : 0,
    marginKnownOrders: marginOrders.length,
    contribution: Math.round(contribution),
    averageContribution: marginOrders.length
      ? Math.round(contribution / marginOrders.length)
      : 0,
    contributionMarginPct:
      marginOrders.length && marginRevenue > 0
        ? round((contribution / marginRevenue) * 100)
        : null,
  };
}

function conversionDifferenceCi(
  serve: PolicyMetricArm,
  holdout: PolicyMetricArm,
): [number, number] | null {
  if (!serve.assignments || !holdout.assignments) return null;

  const pServe = serve.convertedSessions / serve.assignments;
  const pHoldout = holdout.convertedSessions / holdout.assignments;
  const difference = pServe - pHoldout;
  const standardError = Math.sqrt(
    (pServe * (1 - pServe)) / serve.assignments +
      (pHoldout * (1 - pHoldout)) / holdout.assignments,
  );

  if (!Number.isFinite(standardError)) return null;
  const margin = 1.96 * standardError;

  return [round((difference - margin) * 100), round((difference + margin) * 100)];
}

export function calculateRevenuePolicyHealth(params: {
  assignments: PolicyAssignmentInput[];
  paidOrders: PolicyPaidOrderInput[];
  minServeAssignments: number;
  minHoldoutAssignments: number;
  rollbackMarginPctPoints: number;
}): PolicyHealthResult {
  const serve = summarizeArm("SERVE", params.assignments, params.paidOrders);
  const holdout = summarizeArm("HOLDOUT", params.assignments, params.paidOrders);
  const sampleReady =
    serve.assignments >= params.minServeAssignments &&
    holdout.assignments >= params.minHoldoutAssignments;
  const conversionDifference =
    serve.conversionRatePct - holdout.conversionRatePct;
  const ci = conversionDifferenceCi(serve, holdout);

  const rollbackTriggered =
    sampleReady &&
    ci !== null &&
    ci[1] < -Math.abs(params.rollbackMarginPctPoints);

  return {
    sampleReady,
    minServeAssignments: params.minServeAssignments,
    minHoldoutAssignments: params.minHoldoutAssignments,
    rollbackMarginPctPoints: params.rollbackMarginPctPoints,
    serve,
    holdout,
    observedConversionLiftPctPoints: round(conversionDifference),
    observedAovLiftPct: relativeLift(
      serve.averageOrderValue,
      holdout.averageOrderValue,
    ),
    observedPairRateLiftPctPoints: round(
      serve.targetPairRatePct - holdout.targetPairRatePct,
    ),
    conversionDifference95CiPctPoints: ci,
    guardrail: !sampleReady
      ? "COLLECTING"
      : rollbackTriggered
        ? "AUTO_ROLLBACK"
        : "HEALTHY_OR_INCONCLUSIVE",
  };
}
