import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const privacy = read("app/(site)/privacidad/page.tsx");
const deletion = read("app/(site)/eliminacion-datos/page.tsx");
const concierge = read("app/(site)/concierge/page.tsx");
const legal = read("app/(site)/legal/page.tsx");
const callback = read("app/api/meta/data-deletion/route.ts");
const footer = read("components/layout/Footer.tsx");
const schema = read("prisma/schema.prisma");
const review = read("docs/META_APP_REVIEW.md");

assert.doesNotMatch(legal, /Contenido legal pendiente/, "Legal page must not contain placeholders.");
assert.match(privacy, /WhatsApp Business/, "Privacy policy must disclose WhatsApp processing.");
assert.match(privacy, /inteligencia artificial/i, "Privacy policy must disclose AI processing.");
assert.match(deletion, /Eliminación de datos/, "Public deletion instructions must exist.");
assert.match(concierge, /PISÁO Concierge/, "Public service description must exist.");
assert.match(callback, /timingSafeEqual/, "Meta deletion callback must verify signatures safely.");
assert.match(callback, /WHATSAPP_META_APP_SECRET/, "Deletion callback must use the server-side App Secret.");
assert.match(callback, /providerUserIdHash/, "Raw Meta user IDs must not be persisted.");
assert.match(schema, /model MetaDataDeletionRequest/, "Deletion requests need an auditable minimal ledger.");
assert.match(footer, /\/privacidad/, "Privacy URL must be publicly discoverable.");
assert.match(footer, /\/eliminacion-datos/, "Deletion URL must be publicly discoverable.");
assert.match(review, /whatsapp_business_management/, "Review pack must cover WhatsApp management permission.");
assert.match(review, /whatsapp_business_messaging/, "Review pack must cover messaging permission.");

console.log("Meta Compliance Readiness V7 invariants: OK");
