import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260924102500_whatsapp_operations_v5/migration.sql",
);
const state = read("lib/whatsapp/state.ts");
const adapter = read("lib/whatsapp/concierge-adapter.ts");
const operations = read("lib/whatsapp/operations.ts");
const panel = read("components/admin/WhatsAppOperationsPanel.tsx");
const page = read("app/admin/(protected)/whatsapp/page.tsx");
const releaseRoute = read(
  "app/api/admin/whatsapp/handoffs/release/route.ts",
);

assert.match(schema, /attemptCount\s+Int/, "Webhook events must count attempts.");
assert.match(schema, /failureCode\s+String\?/, "Webhook events need sanitized failure codes.");
assert.match(schema, /lastAutoPauseAt/, "Meta config must expose auto-pause state.");
assert.match(migration, /whatsapp_webhook_events_status_receivedAt_idx/, "Migration must index event status.");
assert.match(state, /markWhatsAppWebhookFailed/, "State layer must persist failures.");
assert.match(state, /WHATSAPP_FAILURE_AUTOPAUSE_THRESHOLD/, "Failure threshold must be configurable.");
assert.match(state, /runtimeEnabled:\s*false/, "Failure bursts must auto-pause runtime.");
assert.match(adapter, /CLOUD_API_SEND_FAILED/, "Outbound delivery failures must be classified.");
assert.match(adapter, /CONCIERGE_PROCESSING_FAILED/, "Concierge failures must be classified.");
assert.match(operations, /successRatePct/, "Operations summary must expose success rate.");
assert.match(operations, /p95LatencyMs/, "Operations summary must expose p95 latency.");
assert.match(panel, /Centro operacional de WhatsApp/, "Admin must expose the operations console.");
assert.match(panel, /Liberar handoff/, "Admin must support controlled handoff release.");
assert.match(page, /getWhatsAppOperationsSummary/, "WhatsApp page must load operations telemetry.");
assert.match(releaseRoute, /releaseWhatsAppHumanHandoff/, "Release endpoint must use the state layer.");

for (const source of [operations, panel]) {
  assert.doesNotMatch(source, /message\.text|payload\.body|display_phone_number.*customer/i,
    "Operations surfaces must not expose message bodies or customer phone data.");
}

console.log("WhatsApp Operations V5 invariants: OK");
