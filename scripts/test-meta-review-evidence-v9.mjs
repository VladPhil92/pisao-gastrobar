import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const ledger = read("lib/whatsapp/meta-review-evidence.ts");
const store = read("lib/whatsapp/integration-store.ts");
const readiness = read("lib/whatsapp/readiness.ts");
const adapter = read("lib/whatsapp/concierge-adapter.ts");
const review = read("lib/whatsapp/meta-review.ts");
const component = read("components/admin/MetaAppReviewEvidenceCenter.tsx");
const route = read("app/api/admin/whatsapp/review-evidence/route.ts");
const docs = read("docs/META_APP_REVIEW.md");

assert.match(ledger, /META_REVIEW_INTEGRATION = "META_REVIEW"/);
assert.match(ledger, /embedded_signup_completed/);
assert.match(ledger, /waba_probe_verified/);
assert.match(ledger, /whatsapp_inbound_processed/);
assert.match(ledger, /whatsapp_ai_outbound_sent/);
assert.match(
  ledger,
  /dedupeMinutes/,
  "Automated evidence must avoid unbounded duplicate records.",
);
assert.match(
  store,
  /META_REVIEW_EVENTS\.embeddedSignupCompleted/,
  "Embedded Signup completion must create evidence.",
);
assert.match(
  readiness,
  /META_REVIEW_EVENTS\.wabaProbeVerified/,
  "Successful Meta Graph probe must create evidence.",
);
assert.match(
  adapter,
  /META_REVIEW_EVENTS\.inboundProcessed/,
  "Inbound processing must create evidence.",
);
assert.match(
  adapter,
  /META_REVIEW_EVENTS\.aiOutboundSent/,
  "AI outbound delivery must create evidence.",
);
assert.match(
  review,
  /automatedManagementEvidence/,
  "Management permission readiness must use persisted evidence.",
);
assert.match(
  review,
  /automatedMessagingEvidence/,
  "Messaging permission readiness must use persisted evidence.",
);
assert.match(
  review,
  /engineVersion: "meta_review_evidence_v9"/,
  "Review engine must expose V9.",
);
assert.match(component, /Automated Review Evidence V9/);
assert.match(component, /Generar snapshot/);
assert.match(route, /recordMetaReviewEvidence/);
assert.match(route, /META_REVIEW_EVENTS\.reviewSnapshot/);
assert.match(docs, /V9 — Automated Review Evidence/);

for (const source of [ledger, review, component, route]) {
  assert.doesNotMatch(
    source,
    /accessTokenCiphertext|signed_request.*detail|message\.text.*detail/,
    "Evidence surfaces must not expose secrets or message bodies.",
  );
}

console.log("Meta Automated Review Evidence V9 invariants: OK");
