import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260924023000_whatsapp_embedded_signup_config_v3/migration.sql");
const store = read("lib/whatsapp/meta-config.ts");
const api = read("app/api/admin/whatsapp/meta-config/route.ts");
const page = read("app/admin/(protected)/whatsapp/page.tsx");
const component = read("components/admin/WhatsAppCoexistenceSetup.tsx");

assert.match(schema, /model WhatsAppMetaConfig/, "Schema must persist the non-secret Meta config.");
assert.match(migration, /CREATE TABLE "whatsapp_meta_config"/, "Migration must create the Meta config table.");
assert.match(store, /getEmbeddedSignupConfigId/, "Server store must resolve the configuration ID.");
assert.match(store, /NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID/, "Environment fallback must remain supported.");
assert.match(api, /saveEmbeddedSignupConfigId/, "Admin API must persist the configuration ID.");
assert.match(api, /SUPER_ADMIN/, "Meta configuration must remain behind admin authorization.");
assert.match(page, /getEmbeddedSignupConfigId/, "Admin page must read the runtime configuration.");
assert.match(component, /\/api\/admin\/whatsapp\/meta-config/, "Admin UI must save the configuration without a Render rebuild.");
assert.match(component, /config_id: activeConfigId/, "Embedded Signup must launch with the saved configuration ID.");
assert.match(component, /No necesitas volver a Render/, "UI must communicate the self-service flow.");

console.log("WhatsApp Embedded Signup configuration invariants: OK");
