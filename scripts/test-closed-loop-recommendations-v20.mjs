import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const route = read("app/api/ai/concierge/route.ts");
const commerce = read("lib/revenue/contextual-commerce-core.ts");
const learning = read("lib/revenue/contextual-learning.ts");
const ranking = read("lib/revenue/closed-loop-recommendation-core.ts");
const intelligence = read("lib/analytics/behavioral-intelligence.ts");
const dashboard = read("app/admin/(protected)/comportamiento/page.tsx");

assert.match(ranking, /CLOSED_LOOP_RECOMMENDATION_VERSION/);
assert.match(ranking, /CLOSED_LOOP_MIN_EXPOSURES = 12/);
assert.match(ranking, /CLOSED_LOOP_MAX_ABS_ADJUSTMENT = 8/);
assert.match(ranking, /exposures \/ \(exposures \+ 24\)/);
assert.match(commerce, /learningSignals\?: ClosedLoopSignal\[]/);
assert.match(commerce, /repeatIntent[\s\S]{0,300}adjustment: 0/);
assert.match(commerce, /marginAdjustment\(product\) \+[\s\S]{0,80}learning\.adjustment/);
assert.match(route, /getContextualProductLearning/);
assert.match(route, /controlledRevenueLayer/);
assert.match(route, /closed_loop_applied/);
assert.match(route, /closed_loop_adjustment/);
assert.match(route, /closed_loop_exposures/);
assert.match(learning, /CACHE_TTL_MS = 5 \* 60 \* 1000/);
assert.match(learning, /concierge_nba_view/);
assert.match(learning, /concierge_nba_add/);
assert.match(learning, /order\.pago\?\.estado === "APROBADO"/);
assert.match(intelligence, /closedLoopAdjustment/);
assert.match(dashboard, /Contextual Commerce V20/);
assert.match(dashboard, /Productos habilitados V20/);
assert.match(dashboard, /no demuestra causalidad/);

for (const source of [route, commerce, learning, ranking, intelligence, dashboard]) {
  assert.doesNotMatch(
    source,
    /passwordHash|accessTokenCiphertext|WHATSAPP_META_APP_SECRET/,
    "V20 must not expose credentials or integration secrets.",
  );
}

assert.doesNotMatch(
  learning,
  /clienteNombre|clienteTelefono|clienteEmail|direccionEntrega|notas/,
  "Closed-loop learning lookup must not load customer PII.",
);

console.log("Closed-loop Recommendation Intelligence V20 invariants: OK");
