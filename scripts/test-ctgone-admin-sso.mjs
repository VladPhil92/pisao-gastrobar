import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [federation, callback, authIndex, login, signout] = await Promise.all([
  readFile("lib/auth/ctgone-federation.ts", "utf8"),
  readFile("app/auth/ctgone/callback/route.ts", "utf8"),
  readFile("lib/auth/index.ts", "utf8"),
  readFile("app/admin/login/page.tsx", "utf8"),
  readFile("app/auth/ctgone/signout/route.ts", "utf8"),
]);

assert.match(
  federation,
  /CTG_ONE_ADMIN_SESSION_COOKIE/,
  "Admin federation must use a dedicated signed cookie.",
);
assert.match(
  federation,
  /ctgRole !== "admin"/,
  "Only the canonical CTG One admin role may mint a PISÁO admin session.",
);
assert.match(
  callback,
  /transaction\.next\.startsWith\("\/admin\/"\)/,
  "Admin federation must be scoped to backoffice destinations.",
);
assert.match(
  callback,
  /createAdminSession\(data\.subject, data\.email, data\.role\)/,
  "The callback must derive PISÁO authority from the exchanged CTG One role.",
);
assert.match(
  authIndex,
  /readAdminSession/,
  "Backoffice auth must recognize the signed CTG One admin session.",
);
assert.match(
  authIndex,
  /rol\s*=\s*federated\.rol/,
  "Federated admins must enter PISÁO with ADMIN authorization.",
);
assert.match(
  login,
  /\/auth\/ctgone\/start\?next=\/admin\/dashboard/,
  "The admin login page must make CTG One SSO the primary path.",
);
assert.match(
  login,
  /Acceso local de staff/,
  "Local credentials must remain explicitly scoped to operational staff.",
);
assert.match(
  signout,
  /CTG_ONE_ADMIN_SESSION_COOKIE/,
  "Signout must revoke the federated admin cookie.",
);

console.log("CTG One admin SSO invariants: PASS");
