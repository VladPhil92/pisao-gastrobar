import assert from "node:assert/strict";
import test from "node:test";
import {
  deriveCertificationState,
  deriveOverallCertification,
} from "@/lib/integrations/certification-core";

test("integration certification requires config before evidence", () => {
  assert.equal(deriveCertificationState(false, false), "BLOCKED");
  assert.equal(deriveCertificationState(false, true), "BLOCKED");
  assert.equal(deriveCertificationState(true, false), "READY_FOR_TEST");
  assert.equal(deriveCertificationState(true, true), "CERTIFIED");
});

test("overall certification exposes the strictest production gate", () => {
  assert.equal(
    deriveOverallCertification(["CERTIFIED", "CERTIFIED"]),
    "CERTIFIED",
  );
  assert.equal(
    deriveOverallCertification(["CERTIFIED", "READY_FOR_TEST"]),
    "TESTING",
  );
  assert.equal(
    deriveOverallCertification(["CERTIFIED", "BLOCKED"]),
    "ACTION_REQUIRED",
  );
});
