import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260924025500_whatsapp_activation_v4/migration.sql",
);
const metaConfig = read("lib/whatsapp/meta-config.ts");
const readiness = read("lib/whatsapp/readiness.ts");
const webhook = read("app/api/whatsapp/webhook/route.ts");
const runtimeApi = read("app/api/admin/whatsapp/runtime/route.ts");
const readinessApi = read("app/api/admin/whatsapp/readiness/route.ts");
const adminPage = read("app/admin/(protected)/whatsapp/page.tsx");
const runtimeControl = read("components/admin/WhatsAppRuntimeControl.tsx");
const certification = read("lib/integrations/production-certification.ts");

assert.match(schema, /runtimeEnabled\s+Boolean\?/, "Runtime state must support legacy fallback.");
assert.match(schema, /lastProbeStatus/, "Probe status must be persisted.");
assert.match(migration, /ADD COLUMN "runtimeEnabled"/, "Migration must add runtime state.");
assert.match(metaConfig, /WHATSAPP_WEBHOOK_FORCE_DISABLED/, "Emergency kill switch must exist.");
assert.match(metaConfig, /managed[\s\S]*legacyEnabled/, "Runtime must preserve legacy fallback.");
assert.match(readiness, /graph\.facebook\.com/, "Probe must verify Meta over Graph API.");
assert.match(readiness, /META_CONNECTION_VERIFIED/, "Probe needs a success code.");
assert.match(readiness, /META_TOKEN_REJECTED/, "Invalid Meta tokens must be classified.");
assert.match(runtimeApi, /user\.rol !== "SUPER_ADMIN"/, "Only SUPER_ADMIN may toggle runtime.");
assert.match(runtimeApi, /probeWhatsAppIntegration/, "Activation must be guarded by a fresh probe.");
assert.match(readinessApi, /SUPER_ADMIN.*ADMIN/s, "Admins may run diagnostics.");
assert.match(webhook, /getWhatsAppRuntimeState/, "Webhook must use managed runtime state.");
assert.doesNotMatch(
  webhook,
  /WHATSAPP_WEBHOOK_ENABLED\s*!==\s*"true"/,
  "Webhook must not bypass managed runtime via the legacy flag.",
);
assert.match(adminPage, /WhatsAppRuntimeControl/, "Admin page must expose runtime controls.");
assert.match(runtimeControl, /Verificar conexión/, "UI must expose explicit connection verification.");
assert.match(runtimeControl, /Activar Concierge/, "UI must expose guarded activation.");
assert.match(certification, /getWhatsAppRuntimeState/, "Certification must use managed runtime state.");
assert.match(certification, /Conexión verificada contra Meta/, "Certification must require a successful probe.");

console.log("WhatsApp Production Activation V4 invariants: OK");
