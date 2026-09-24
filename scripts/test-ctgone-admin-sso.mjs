import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  federation,
  callback,
  startRoute,
  authIndex,
  loginPage,
  loginForm,
  federatedAdmin,
  signout,
] = await Promise.all([
  readFile("lib/auth/ctgone-federation.ts", "utf8"),
  readFile("app/auth/ctgone/callback/route.ts", "utf8"),
  readFile("app/auth/ctgone/start/route.ts", "utf8"),
  readFile("lib/auth/index.ts", "utf8"),
  readFile("app/admin/login/page.tsx", "utf8"),
  readFile("components/admin/AdminLoginForm.tsx", "utf8"),
  readFile("lib/auth/federated-admin.ts", "utf8"),
  readFile("app/auth/ctgone/signout/route.ts", "utf8"),
]);

assert.match(
  federation,
  /CTG_ONE_ADMIN_SESSION_COOKIE/,
  "Admin federation must use a dedicated signed cookie.",
);
assert.match(
  federation,
  /PISAO_PUBLIC_ORIGIN/,
  "Federated redirects must resolve against the canonical PISÁO public origin.",
);
assert.match(
  federation,
  /pisaoPublicUrl/,
  "Federated routes must share a canonical public URL builder.",
);
assert.match(
  federation,
  /ctgRole !== "admin"/,
  "Only the canonical CTG One admin role may mint a PISÁO admin session.",
);
assert.match(
  federation,
  /candidate\.includes\("\\\\"\)/,
  "Federation redirect normalization must reject backslashes.",
);
assert.match(
  callback,
  /transaction\.next\.startsWith\("\/admin\/"\)/,
  "Admin federation must be scoped to backoffice destinations.",
);
assert.match(
  callback,
  /ensureFederatedAdminUser\(data\.subject, localRole\)/,
  "Federated admins must be mapped to a local PISÁO actor before access.",
);
assert.match(
  callback,
  /createAdminSession\([\s\S]*?data\.subject,[\s\S]*?localAdmin\.id,[\s\S]*?data\.email,[\s\S]*?data\.role/,
  "The signed admin session must bind CTG identity, local actor id and canonical role.",
);
assert.match(
  callback,
  /federatedPisaoRole\(data\.email\)/,
  "Super admin elevation must be resolved from the explicit PISÁO allowlist.",
);
assert.match(
  federatedAdmin,
  /federated\.pisao\.invalid/,
  "Federated administrators must use a dedicated synthetic local actor identity.",
);
assert.match(
  federatedAdmin,
  /randomBytes\(32\)/,
  "Federated admin actors must never retain a stable local password.",
);
assert.match(
  federatedAdmin,
  /prisma\.usuario\.(findUnique|create|update)/,
  "Federated admin provisioning must resolve a real local Usuario row.",
);

const roleGateIndex = callback.indexOf('data.role !== "admin"');
const actorProvisionIndex = callback.indexOf("ensureFederatedAdminUser(data.subject, localRole)");
assert.ok(
  roleGateIndex >= 0 &&
    actorProvisionIndex >= 0 &&
    roleGateIndex < actorProvisionIndex,
  "CTG One admin role must be validated before any local actor mutation.",
);
assert.match(
  authIndex,
  /federated\.localUserId/,
  "Database writes must use the local PISÁO user id rather than the external CTG subject.",
);
const federatedReadIndex = authIndex.indexOf("readAdminSession");
const localSessionIndex = authIndex.lastIndexOf("nextAuth.auth()");
assert.ok(
  federatedReadIndex >= 0 &&
    localSessionIndex >= 0 &&
    federatedReadIndex < localSessionIndex,
  "Federated ADMIN authority must take precedence over stale local staff sessions.",
);
assert.match(
  loginForm,
  /\/auth\/ctgone\/start\?next=\/admin\/dashboard/,
  "The admin login UI must keep CTG One SSO available.",
);
assert.match(
  loginForm,
  /Entrar con mi cuenta CTG One/,
  "The owner/admin CTG One path must be explicit and primary.",
);
assert.match(
  loginForm,
  /Acceso interno de empleados PISÁO/,
  "Local employee credentials must remain available alongside CTG One federation.",
);
assert.match(
  loginPage,
  /federationMessage/,
  "Federation failures must render on the admin login page.",
);
assert.match(
  startRoute,
  /admin\/login\?ctgone=federation_unavailable/,
  "Unavailable admin federation must return to the backoffice login.",
);
assert.match(
  signout,
  /CTG_ONE_ADMIN_SESSION_COOKIE/,
  "Signout must revoke the federated admin cookie.",
);
for (const [name, source] of [
  ["callback", callback],
  ["start", startRoute],
  ["signout", signout],
]) {
  assert.doesNotMatch(
    source,
    /new URL\([^\n]*request\.url|new URL\([\s\S]{0,160}?request\.url/,
    `${name} must never build browser redirects from Render's internal request.url.`,
  );
}
assert.match(
  callback,
  /pisaoPublicUrl\(transaction\.next\)/,
  "Successful federation must return to the canonical public PISÁO origin.",
);

console.log("CTG One admin SSO invariants: PASS");
