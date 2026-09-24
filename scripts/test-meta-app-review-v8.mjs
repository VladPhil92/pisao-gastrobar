import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const schema = read("prisma/schema.prisma");
const metaConfig = read("lib/whatsapp/meta-config.ts");
const review = read("lib/whatsapp/meta-review.ts");
const component = read("components/admin/MetaAppReviewEvidenceCenter.tsx");
const page = read("app/admin/(protected)/whatsapp/page.tsx");
const route = read("app/api/admin/whatsapp/meta-config/route.ts");

assert.match(
  schema,
  /metaAccessVerificationStatus/,
  "Schema must persist Access Verification status.",
);
assert.match(
  schema,
  /metaAppReviewStatus/,
  "Schema must persist App Review status.",
);
assert.match(
  metaConfig,
  /META_ACCESS_VERIFICATION_STATUSES/,
  "Access Verification statuses must be constrained.",
);
assert.match(
  metaConfig,
  /META_APP_REVIEW_STATUSES/,
  "App Review statuses must be constrained.",
);
assert.match(
  review,
  /readyForSubmission/,
  "Review readiness must derive an explicit submission gate.",
);
assert.match(
  review,
  /whatsapp_business_management/,
  "Review readiness must cover WhatsApp Business Management.",
);
assert.match(
  review,
  /whatsapp_business_messaging/,
  "Review readiness must cover WhatsApp Business Messaging.",
);
assert.match(
  review,
  /business_management/,
  "Review readiness must cover Business Management.",
);
assert.match(
  review,
  /manage_app_solution/,
  "Review readiness must cover Manage App Solution.",
);
assert.match(
  component,
  /AÚN NO ENVIAR/,
  "UI must not imply App Review is ready before gates pass.",
);
assert.match(
  component,
  /EVIDENCIA DISPONIBLE/,
  "UI must distinguish real evidence from readiness.",
);
assert.match(
  page,
  /MetaAppReviewEvidenceCenter/,
  "WhatsApp admin must render the review evidence center.",
);
assert.match(
  route,
  /saveMetaReviewLifecycle/,
  "Admin API must persist review lifecycle changes.",
);

console.log("Meta App Review Evidence Center V8 invariants: OK");
