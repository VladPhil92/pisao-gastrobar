import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const route = read("app/api/ai/concierge/route.ts");
const commerce = read("lib/revenue/contextual-commerce-core.ts");
const bandit = read("lib/revenue/contextual-bandit-core.ts");
const metrics = read("lib/revenue/contextual-bandit-metrics-core.ts");
const concierge = read("components/ai/PisaoConcierge.tsx");
const contract = read("lib/analytics/behavioral-contract.ts");
const intelligence = read("lib/analytics/behavioral-intelligence.ts");
const dashboard = read("app/admin/(protected)/comportamiento/page.tsx");

assert.match(bandit, /CONTEXTUAL_BANDIT_VERSION/);
assert.match(bandit, /CONTEXTUAL_BANDIT_EXPLORE_PCT = 10/);
assert.match(bandit, /CONTEXTUAL_BANDIT_HOLDOUT_PCT = 10/);
assert.match(bandit, /CONTEXTUAL_BANDIT_MAX_SCORE_GAP = 6/);
assert.match(bandit, /CONTEXTUAL_BANDIT_MAX_POOL = 3/);
assert.match(bandit, /stableHash/);
assert.match(bandit, /bounded_exploration/);
assert.match(commerce, /explorationSessionId\?: string/);
assert.match(commerce, /allowExploration: !repeatIntent/);
assert.match(commerce, /selectContextualBanditCandidate/);
assert.match(route, /sanitizeBehaviorSessionId/);
assert.match(route, /explorationSessionId: behaviorSessionId/);
assert.match(route, /bandit_arm/);
assert.match(route, /bandit_explored/);
assert.match(route, /bandit_pool_size/);
assert.match(route, /bandit: contextualCommerce\.action\?\.bandit/);
assert.match(contract, /"bandit_exploit"/);
assert.match(contract, /"bandit_explore"/);
assert.match(contract, /"bandit_holdout"/);
assert.match(concierge, /banditIntent/);
assert.match(concierge, /intent: banditIntent\(payload\.contextualRecommendation\)/);
assert.match(concierge, /intent: banditIntent\(recommendation\)/);
assert.match(metrics, /summarizeContextualBanditMetrics/);
assert.match(intelligence, /contextualBandit/);
assert.match(dashboard, /Contextual Commerce V21/);
assert.match(dashboard, /Exploration Governance V21/);
assert.match(dashboard, /no declaran? un ganador|no declaran un ganador/);

const cardStart = concierge.indexOf("Sugerencia opcional");
const cardEnd = concierge.indexOf("message.proposal", cardStart);
const card = concierge.slice(cardStart, cardEnd > cardStart ? cardEnd : cardStart + 3000);
assert.doesNotMatch(
  card,
  /EXPLORE|EXPLOIT|HOLDOUT|bandit\.arm/,
  "Bandit assignment must not be rendered in the guest recommendation card.",
);

for (const source of [
  route,
  commerce,
  bandit,
  metrics,
  concierge,
  contract,
  intelligence,
  dashboard,
]) {
  assert.doesNotMatch(
    source,
    /passwordHash|accessTokenCiphertext|WHATSAPP_META_APP_SECRET/,
    "V21 must not expose credentials or integration secrets.",
  );
}

console.log("Contextual Bandit & Exploration Governance V21 invariants: OK");
