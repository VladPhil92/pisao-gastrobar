import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRevenueTouches } from "./revenue-attribution-core";

test("revenue attribution de-duplicates assists and keeps last observed assist", () => {
  const base = new Date("2026-09-23T15:00:00.000Z");
  const result = summarizeRevenueTouches([
    { tipo: "concierge_open", createdAt: base },
    {
      tipo: "concierge_proposal_add",
      createdAt: new Date(base.getTime() + 1_000),
    },
    {
      tipo: "plan_proposal_add",
      createdAt: new Date(base.getTime() + 2_000),
    },
  ]);

  assert.deepEqual(result.assists, ["CONCIERGE", "PLAN"]);
  assert.equal(result.lastAssist, "PLAN");
  assert.equal(result.touchCount, 3);
  assert.equal(result.observedFrom?.toISOString(), base.toISOString());
});

test("WhatsApp handoff records both Concierge and WhatsApp without claiming causality", () => {
  const result = summarizeRevenueTouches([
    {
      tipo: "concierge_handoff_whatsapp",
      createdAt: new Date("2026-09-23T15:00:00.000Z"),
    },
  ]);

  assert.deepEqual(result.assists, ["CONCIERGE", "WHATSAPP"]);
  assert.equal(result.lastAssist, "WHATSAPP");
  assert.equal(result.touchCount, 1);
});

test("non-assist events remain a tracked direct session", () => {
  const result = summarizeRevenueTouches([
    {
      tipo: "menu_view",
      createdAt: new Date("2026-09-23T15:00:00.000Z"),
    },
  ]);

  assert.deepEqual(result.assists, []);
  assert.equal(result.lastAssist, null);
  assert.equal(result.touchCount, 0);
  assert.equal(result.observedFrom, null);
});
