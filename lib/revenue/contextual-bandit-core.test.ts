import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTEXTUAL_BANDIT_MAX_SCORE_GAP,
  assignContextualBanditArm,
  selectContextualBanditCandidate,
} from "./contextual-bandit-core";

function findSessionForArm(
  target: ReturnType<typeof assignContextualBanditArm>,
) {
  for (let index = 0; index < 10_000; index += 1) {
    const sessionId = `session_${String(index).padStart(6, "0")}`;
    if (assignContextualBanditArm(sessionId) === target) return sessionId;
  }
  throw new Error(`No session found for ${target}`);
}

test("arm assignment is deterministic for the same first-party session", () => {
  const sessionId = "session_deterministic_123";
  assert.equal(
    assignContextualBanditArm(sessionId),
    assignContextualBanditArm(sessionId),
  );
});

test("invalid or missing session falls back to exploitation", () => {
  assert.equal(assignContextualBanditArm(undefined), "EXPLOIT");
  assert.equal(assignContextualBanditArm("bad!"), "EXPLOIT");
});

test("holdout and exploit preserve the top-ranked candidate", () => {
  for (const arm of ["HOLDOUT", "EXPLOIT"] as const) {
    const sessionId = findSessionForArm(arm);
    const result = selectContextualBanditCandidate({
      sessionId,
      allowExploration: true,
      candidates: [
        { productSlug: "top", score: 50, exposures: 30 },
        { productSlug: "other", score: 49, exposures: 1 },
      ],
    });

    assert.equal(result.arm, arm);
    assert.equal(result.selectedSlug, "top");
    assert.equal(result.explored, false);
  }
});

test("exploration can select a near-tied under-exposed alternative", () => {
  const sessionId = findSessionForArm("EXPLORE");
  const result = selectContextualBanditCandidate({
    sessionId,
    allowExploration: true,
    candidates: [
      { productSlug: "winner", score: 50, exposures: 60 },
      { productSlug: "cold-start", score: 48.5, exposures: 2 },
      { productSlug: "mature-alt", score: 49, exposures: 40 },
    ],
  });

  assert.equal(result.arm, "EXPLORE");
  assert.equal(result.selectedSlug, "cold-start");
  assert.equal(result.explored, true);
  assert.equal(result.reason, "bounded_exploration");
});

test("exploration refuses alternatives outside the relevance score gap", () => {
  const sessionId = findSessionForArm("EXPLORE");
  const result = selectContextualBanditCandidate({
    sessionId,
    allowExploration: true,
    candidates: [
      { productSlug: "winner", score: 50, exposures: 60 },
      {
        productSlug: "too-weak",
        score: 50 - CONTEXTUAL_BANDIT_MAX_SCORE_GAP - 0.01,
        exposures: 0,
      },
    ],
  });

  assert.equal(result.selectedSlug, "winner");
  assert.equal(result.explored, false);
  assert.equal(result.reason, "no_safe_alternative");
});

test("explicit guardrail can disable exploration even on an explore session", () => {
  const sessionId = findSessionForArm("EXPLORE");
  const result = selectContextualBanditCandidate({
    sessionId,
    allowExploration: false,
    candidates: [
      { productSlug: "winner", score: 50, exposures: 60 },
      { productSlug: "cold-start", score: 49, exposures: 0 },
    ],
  });

  assert.equal(result.arm, "EXPLORE");
  assert.equal(result.selectedSlug, "winner");
  assert.equal(result.explored, false);
  assert.equal(result.reason, "exploration_disabled");
});

test("exploration selection remains stable within the same session", () => {
  const sessionId = findSessionForArm("EXPLORE");
  const candidates = [
    { productSlug: "winner", score: 50, exposures: 50 },
    { productSlug: "alt-a", score: 49, exposures: 1 },
    { productSlug: "alt-b", score: 49, exposures: 1 },
  ];

  const first = selectContextualBanditCandidate({
    sessionId,
    allowExploration: true,
    candidates,
  });
  const second = selectContextualBanditCandidate({
    sessionId,
    allowExploration: true,
    candidates,
  });

  assert.equal(first.selectedSlug, second.selectedSlug);
  assert.equal(first.arm, second.arm);
});
