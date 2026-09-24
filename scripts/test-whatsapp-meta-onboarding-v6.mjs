import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const guide = read("components/admin/MetaEmbeddedSignupGuide.tsx");
const setup = read("components/admin/WhatsAppCoexistenceSetup.tsx");
const page = read("app/admin/(protected)/whatsapp/page.tsx");
const docs = read("docs/WHATSAPP_CORE.md");

assert.match(guide, /Meta Setup Wizard V6/, "Admin needs the Meta setup wizard.");
assert.match(guide, /WhatsApp Embedded Signup/, "Wizard must specify the login variation.");
assert.match(guide, /whatsapp_business_management/, "Wizard must show management permission.");
assert.match(guide, /whatsapp_business_messaging/, "Wizard must show messaging permission.");
assert.match(guide, /pisaogastrobar\.com/, "Wizard must show the production domain.");
assert.match(guide, /api\/whatsapp\/webhook/, "Wizard must expose the webhook URL.");
assert.match(page, /MetaEmbeddedSignupGuide/, "Admin page must mount the setup wizard.");
assert.match(setup, /Embedded Signup v4/, "Launcher must label the v4 flow.");
assert.match(setup, /parsed\.event === "ERROR"/, "Launcher must surface Meta errors.");
assert.match(setup, /whatsapp_business_app_onboarding/, "Coexistence feature type must remain enabled.");
assert.match(docs, /V6 — Meta Embedded Signup v4 Setup Wizard/, "Docs must cover v4 setup.");

console.log("WhatsApp Meta Onboarding V6 invariants: OK");
