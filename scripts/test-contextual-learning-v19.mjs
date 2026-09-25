import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const route = read("app/api/ai/concierge/route.ts");
const concierge = read("components/ai/PisaoConcierge.tsx");
const contract = read("lib/analytics/behavioral-contract.ts");
const intelligence = read("lib/analytics/behavioral-intelligence.ts");
const attribution = read("lib/analytics/revenue-attribution-core.ts");
const dashboard = read("app/admin/(protected)/comportamiento/page.tsx");
const learning = read("lib/revenue/contextual-learning-core.ts");

assert.match(learning, /CONTEXTUAL_LEARNING_VERSION/);
assert.match(learning, /CONTEXTUAL_OUTCOME_WINDOW_MS/);
assert.match(learning, /concierge_nba_view/);
assert.match(learning, /concierge_nba_add/);
assert.match(route, /contextualRecommendation/);
assert.match(route, /recommendedProduct/);
assert.doesNotMatch(route, /contextualRecommendation[\s\S]{0,700}costoUnitario/);
assert.match(concierge, /Sugerencia opcional/);
assert.match(concierge, /addContextualRecommendation/);
assert.match(concierge, /trackBehavior\("concierge_nba_view"/);
assert.match(concierge, /trackBehavior\("concierge_nba_add"/);
assert.match(concierge, /Solo se agrega si tú lo eliges/);
assert.match(contract, /"concierge_nba_view"/);
assert.match(contract, /"concierge_nba_add"/);
assert.match(attribution, /concierge_nba_view: \["CONCIERGE"\]/);
assert.match(attribution, /concierge_nba_add: \["CONCIERGE"\]/);
assert.match(intelligence, /summarizeContextualCommerceLearning/);
assert.match(intelligence, /order\.pago\?\.estado === "APROBADO"/);
assert.match(dashboard, /Contextual Commerce V(?:19|20)/);
assert.match(dashboard, /no demuestra causalidad/);

for (const source of [route, concierge, contract, intelligence, attribution, dashboard, learning]) {
  assert.doesNotMatch(
    source,
    /passwordHash|accessTokenCiphertext|WHATSAPP_META_APP_SECRET/,
    "V19 surfaces must not expose credentials or integration secrets.",
  );
}

console.log("Contextual Learning V19 release invariants: OK");
