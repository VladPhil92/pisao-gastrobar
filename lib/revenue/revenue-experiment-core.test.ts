import assert from "node:assert/strict";
import test from "node:test";
import {
  assignExperimentArm,
  calculateExperimentResult,
} from "./revenue-experiment-core";

test("assignment is stable for the same experiment and session", () => {
  const first = assignExperimentArm("exp-1", "session_abcdefghijklmnop", 50);
  const second = assignExperimentArm("exp-1", "session_abcdefghijklmnop", 50);
  assert.equal(first, second);
});

test("assignment produces both arms across many sessions", () => {
  const arms = new Set(
    Array.from({ length: 200 }, (_, index) =>
      assignExperimentArm("exp-1", `session_${String(index).padStart(20, "0")}`, 50),
    ),
  );
  assert.deepEqual([...arms].sort(), ["CONTROL", "TREATMENT"]);
});

test("result remains insufficient before minimum sample per arm", () => {
  const result = calculateExperimentResult({
    assignments: [
      { sessionId: "a", arm: "CONTROL" },
      { sessionId: "b", arm: "TREATMENT" },
    ],
    paidOrders: [{ sessionId: "b", total: 50000, containsTargetPair: true }],
    minAssignmentsPerArm: 30,
  });

  assert.equal(result.sampleReady, false);
  assert.equal(result.interpretation, "INSUFFICIENT_SAMPLE");
});

test("paid conversion is calculated by unique assigned session", () => {
  const assignments = [
    ...Array.from({ length: 30 }, (_, index) => ({
      sessionId: `control_${index}`,
      arm: "CONTROL" as const,
    })),
    ...Array.from({ length: 30 }, (_, index) => ({
      sessionId: `treatment_${index}`,
      arm: "TREATMENT" as const,
    })),
  ];
  const paidOrders = [
    ...Array.from({ length: 3 }, (_, index) => ({
      sessionId: `control_${index}`,
      total: 40000,
      containsTargetPair: false,
    })),
    ...Array.from({ length: 18 }, (_, index) => ({
      sessionId: `treatment_${index}`,
      total: 50000,
      containsTargetPair: index < 9,
    })),
  ];

  const result = calculateExperimentResult({
    assignments,
    paidOrders,
    minAssignmentsPerArm: 30,
  });

  assert.equal(result.sampleReady, true);
  assert.equal(result.control.conversionRatePct, 10);
  assert.equal(result.treatment.conversionRatePct, 60);
  assert.equal(result.treatment.targetPairOrders, 9);
  assert.equal(result.interpretation, "TREATMENT_OBSERVED_HIGHER");
});

test("a randomized experiment can remain inconclusive after reaching sample", () => {
  const assignments = [
    ...Array.from({ length: 40 }, (_, index) => ({
      sessionId: `control_${index}`,
      arm: "CONTROL" as const,
    })),
    ...Array.from({ length: 40 }, (_, index) => ({
      sessionId: `treatment_${index}`,
      arm: "TREATMENT" as const,
    })),
  ];
  const paidOrders = [
    ...Array.from({ length: 8 }, (_, index) => ({
      sessionId: `control_${index}`,
      total: 40000,
    })),
    ...Array.from({ length: 9 }, (_, index) => ({
      sessionId: `treatment_${index}`,
      total: 41000,
    })),
  ];

  const result = calculateExperimentResult({
    assignments,
    paidOrders,
    minAssignmentsPerArm: 30,
  });

  assert.equal(result.sampleReady, true);
  assert.equal(result.interpretation, "INCONCLUSIVE");
});
