import assert from "node:assert/strict";
import test from "node:test";
import {
  assignRevenuePolicyArm,
  calculateRevenuePolicyHealth,
  selectAdaptivePairingCandidate,
} from "./revenue-policy-core";

test("adaptive assignment is stable for a policy and session", () => {
  const a = assignRevenuePolicyArm("policy-1", "session_abcdefghijklmnop", 90);
  const b = assignRevenuePolicyArm("policy-1", "session_abcdefghijklmnop", 90);
  assert.equal(a, b);
});

test("adaptive assignment preserves a holdout", () => {
  const arms = Array.from({ length: 1000 }, (_, index) =>
    assignRevenuePolicyArm(
      "policy-1",
      `session_${String(index).padStart(20, "0")}`,
      90,
    ),
  );
  assert.ok(arms.includes("SERVE"));
  assert.ok(arms.includes("HOLDOUT"));
});

test("context selection favors direct product relevance", () => {
  const selected = selectAdaptivePairingCandidate(
    "Quiero el Patacón Callejero, ¿qué bebida me recomiendas?",
    [
      {
        id: "a",
        priorityScore: 90,
        observedLiftPctPoints: 8,
        productAName: "Hamburguesa Caribe",
        productBName: "Irish Red Ale",
      },
      {
        id: "b",
        priorityScore: 60,
        observedLiftPctPoints: 4,
        productAName: "Patacón Callejero",
        productBName: "Golden Pale Ale",
      },
    ],
  );

  assert.equal(selected?.candidate.id, "b");
});

test("irrelevant messages do not force an adaptive action", () => {
  const selected = selectAdaptivePairingCandidate("¿Dónde están ubicados?", [
    {
      id: "a",
      priorityScore: 90,
      observedLiftPctPoints: 8,
      productAName: "Patacón Callejero",
      productBName: "Golden Pale Ale",
    },
  ]);
  assert.equal(selected, null);
});

test("guardrail auto-rolls back only after sample and clear harm", () => {
  const assignments = [
    ...Array.from({ length: 40 }, (_, index) => ({
      sessionId: `serve_${index}`,
      arm: "SERVE" as const,
    })),
    ...Array.from({ length: 20 }, (_, index) => ({
      sessionId: `holdout_${index}`,
      arm: "HOLDOUT" as const,
    })),
  ];
  const paidOrders = [
    ...Array.from({ length: 2 }, (_, index) => ({
      sessionId: `serve_${index}`,
      total: 40000,
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
      sessionId: `holdout_${index}`,
      total: 40000,
    })),
  ];

  const result = calculateRevenuePolicyHealth({
    assignments,
    paidOrders,
    minServeAssignments: 40,
    minHoldoutAssignments: 20,
    rollbackMarginPctPoints: 2,
  });

  assert.equal(result.sampleReady, true);
  assert.equal(result.guardrail, "AUTO_ROLLBACK");
});

test("guardrail remains collecting before holdout minimum", () => {
  const result = calculateRevenuePolicyHealth({
    assignments: [
      ...Array.from({ length: 40 }, (_, index) => ({
        sessionId: `serve_${index}`,
        arm: "SERVE" as const,
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        sessionId: `holdout_${index}`,
        arm: "HOLDOUT" as const,
      })),
    ],
    paidOrders: [],
    minServeAssignments: 40,
    minHoldoutAssignments: 20,
    rollbackMarginPctPoints: 2,
  });

  assert.equal(result.guardrail, "COLLECTING");
});


test("profitability is only a bounded secondary signal", () => {
  const selected = selectAdaptivePairingCandidate(
    "¿Qué bebida me recomiendas para acompañar?",
    [
      {
        id: "higher-margin",
        priorityScore: 60,
        observedLiftPctPoints: 4,
        productAName: "Patacón Callejero",
        productBName: "Golden Pale Ale",
        profitabilityAdjustment: 10,
      },
      {
        id: "lower-margin",
        priorityScore: 60,
        observedLiftPctPoints: 4,
        productAName: "Hamburguesa Caribe",
        productBName: "Irish Red Ale",
        profitabilityAdjustment: -10,
      },
    ],
  );

  assert.equal(selected?.candidate.id, "higher-margin");
});

test("policy health reports contribution only for orders with known cost", () => {
  const result = calculateRevenuePolicyHealth({
    assignments: [
      { sessionId: "serve_1", arm: "SERVE" },
      { sessionId: "holdout_1", arm: "HOLDOUT" },
    ],
    paidOrders: [
      {
        sessionId: "serve_1",
        total: 50000,
        contribution: 30000,
      },
      {
        sessionId: "holdout_1",
        total: 40000,
        contribution: null,
      },
    ],
    minServeAssignments: 1,
    minHoldoutAssignments: 1,
    rollbackMarginPctPoints: 2,
  });

  assert.equal(result.serve.marginKnownOrders, 1);
  assert.equal(result.serve.contribution, 30000);
  assert.equal(result.serve.contributionMarginPct, 60);
  assert.equal(result.holdout.marginKnownOrders, 0);
  assert.equal(result.holdout.contributionMarginPct, null);
});
