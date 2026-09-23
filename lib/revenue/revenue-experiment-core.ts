export type ExperimentArm = "CONTROL" | "TREATMENT";

export type ExperimentAssignmentInput = {
  sessionId: string;
  arm: ExperimentArm;
};

export type ExperimentPaidOrderInput = {
  sessionId: string;
  total: number;
  containsTargetPair?: boolean;
};

export type ExperimentMetricArm = {
  assignments: number;
  convertedSessions: number;
  conversionRatePct: number;
  paidOrders: number;
  revenue: number;
  averageOrderValue: number;
  targetPairOrders: number;
  targetPairRatePct: number;
};

export type ExperimentResult = {
  sampleReady: boolean;
  minAssignmentsPerArm: number;
  control: ExperimentMetricArm;
  treatment: ExperimentMetricArm;
  observedConversionLiftPctPoints: number;
  observedConversionLiftRelativePct: number | null;
  observedAovLiftPct: number | null;
  observedPairRateLiftPctPoints: number;
  conversionDifference95CiPctPoints: [number, number] | null;
  interpretation:
    | "INSUFFICIENT_SAMPLE"
    | "INCONCLUSIVE"
    | "TREATMENT_OBSERVED_HIGHER"
    | "CONTROL_OBSERVED_HIGHER";
};

function clampTreatment(value: number) {
  if (!Number.isFinite(value)) return 50;
  return Math.max(1, Math.min(99, Math.round(value)));
}

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function assignExperimentArm(
  experimentKey: string,
  sessionId: string,
  treatmentPct = 50,
): ExperimentArm {
  const bucket = stableHash(`${experimentKey}:${sessionId}`) % 100;
  return bucket < clampTreatment(treatmentPct) ? "TREATMENT" : "CONTROL";
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function relativeLift(current: number, baseline: number) {
  if (baseline <= 0) return current > 0 ? null : 0;
  return round(((current - baseline) / baseline) * 100);
}

function summarizeArm(
  arm: ExperimentArm,
  assignments: ExperimentAssignmentInput[],
  orders: ExperimentPaidOrderInput[],
): ExperimentMetricArm {
  const sessionIds = new Set(
    assignments.filter((item) => item.arm === arm).map((item) => item.sessionId),
  );
  const armOrders = orders.filter((order) => sessionIds.has(order.sessionId));
  const convertedSessions = new Set(armOrders.map((order) => order.sessionId));
  const revenue = armOrders.reduce((sum, order) => sum + order.total, 0);
  const targetPairOrders = armOrders.filter((order) => order.containsTargetPair).length;

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
  };
}

function conversionDifferenceCi(
  treatment: ExperimentMetricArm,
  control: ExperimentMetricArm,
): [number, number] | null {
  if (!treatment.assignments || !control.assignments) return null;

  const pT = treatment.convertedSessions / treatment.assignments;
  const pC = control.convertedSessions / control.assignments;
  const difference = pT - pC;
  const standardError = Math.sqrt(
    (pT * (1 - pT)) / treatment.assignments +
      (pC * (1 - pC)) / control.assignments,
  );

  if (!Number.isFinite(standardError)) return null;
  const margin = 1.96 * standardError;

  return [round((difference - margin) * 100), round((difference + margin) * 100)];
}

export function calculateExperimentResult(params: {
  assignments: ExperimentAssignmentInput[];
  paidOrders: ExperimentPaidOrderInput[];
  minAssignmentsPerArm: number;
}): ExperimentResult {
  const control = summarizeArm("CONTROL", params.assignments, params.paidOrders);
  const treatment = summarizeArm("TREATMENT", params.assignments, params.paidOrders);
  const sampleReady =
    control.assignments >= params.minAssignmentsPerArm &&
    treatment.assignments >= params.minAssignmentsPerArm;

  const conversionDifference =
    treatment.conversionRatePct - control.conversionRatePct;
  const ci = conversionDifferenceCi(treatment, control);

  let interpretation: ExperimentResult["interpretation"] = "INSUFFICIENT_SAMPLE";
  if (sampleReady) {
    if (ci && ci[0] > 0) interpretation = "TREATMENT_OBSERVED_HIGHER";
    else if (ci && ci[1] < 0) interpretation = "CONTROL_OBSERVED_HIGHER";
    else interpretation = "INCONCLUSIVE";
  }

  return {
    sampleReady,
    minAssignmentsPerArm: params.minAssignmentsPerArm,
    control,
    treatment,
    observedConversionLiftPctPoints: round(conversionDifference),
    observedConversionLiftRelativePct: relativeLift(
      treatment.conversionRatePct,
      control.conversionRatePct,
    ),
    observedAovLiftPct: relativeLift(
      treatment.averageOrderValue,
      control.averageOrderValue,
    ),
    observedPairRateLiftPctPoints: round(
      treatment.targetPairRatePct - control.targetPairRatePct,
    ),
    conversionDifference95CiPctPoints: ci,
    interpretation,
  };
}
