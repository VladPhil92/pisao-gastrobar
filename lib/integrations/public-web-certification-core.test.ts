import assert from "node:assert/strict";
import test from "node:test";
import {
  publicWebCertified,
  publicWebEvidence,
  type PublicWebProbe,
} from "@/lib/integrations/public-web-certification-core";

const healthy: PublicWebProbe = {
  configured: true,
  homeOk: true,
  currentRelease: true,
  legacyReleaseAbsent: true,
  healthOk: true,
  databaseOk: true,
  imageOk: true,
  imageBytes: 159637,
  securityHeadersOk: true,
};

test("public web certification requires all critical signals", () => {
  assert.equal(publicWebCertified(healthy), true);
  assert.equal(publicWebCertified({ ...healthy, imageBytes: 1024 }), false);
  assert.equal(publicWebCertified({ ...healthy, currentRelease: false }), false);
  assert.equal(publicWebCertified({ ...healthy, securityHeadersOk: false }), false);
});

test("public web evidence explains the first blocking condition", () => {
  assert.match(
    publicWebEvidence({ ...healthy, currentRelease: false }),
    /versión esperada/i,
  );
  assert.match(
    publicWebEvidence({ ...healthy, imageOk: false }),
    /fotografía/i,
  );
  assert.match(publicWebEvidence(healthy), /correctamente/i);
});
