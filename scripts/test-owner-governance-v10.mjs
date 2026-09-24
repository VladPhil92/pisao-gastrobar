import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const schema = read("prisma/schema.prisma");
const authConfig = read("lib/auth/config.ts");
const authIndex = read("lib/auth/index.ts");
const roles = read("lib/auth/roles.ts");
const sidebar = read("components/admin/AdminSidebar.tsx");
const audit = read("lib/admin/audit.ts");
const governance = read("lib/admin/governance.ts");
const usersRoute = read("app/api/admin/users/route.ts");
const userRoute = read("app/api/admin/users/[id]/route.ts");
const page = read("app/admin/(protected)/usuarios/page.tsx");
const manager = read("components/admin/OwnerGovernanceManager.tsx");
const payment = read("app/api/admin/pedidos/[id]/verificar/route.ts");
const inventory = read("app/api/admin/inventory/ingredients/[id]/stock/route.ts");
const whatsapp = read("app/api/admin/whatsapp/runtime/route.ts");
const meta = read("app/api/admin/whatsapp/meta-config/route.ts");

assert.match(schema, /sessionVersion\s+Int\s+@default\(1\)/);
assert.match(schema, /model AdminAuditEvent/);
assert.match(schema, /@@map\("admin_audit_events"\)/);

assert.match(authConfig, /sessionVersion: usuario\.sessionVersion/);
assert.match(authIndex, /current\.sessionVersion !== localUser\.sessionVersion/);
assert.match(authIndex, /!current\?\.activo/);

assert.match(roles, /"\/admin\/usuarios": \["SUPER_ADMIN"\]/);
assert.match(sidebar, /href: "\/admin\/usuarios"/);
assert.match(sidebar, /href: "\/admin\/inventario"/);

assert.match(audit, /recordAdminAudit/);
assert.match(audit, /federated\.pisao\.invalid/);
assert.doesNotMatch(audit, /passwordHash|accessTokenCiphertext/);

assert.match(governance, /getOwnerGovernanceSnapshot/);
assert.match(usersRoute, /user\.rol === "SUPER_ADMIN"/);
assert.match(usersRoute, /temporaryPassword\.length < 12/);
assert.match(userRoute, /No puedes retirar tu propio rol SUPER_ADMIN/);
assert.match(userRoute, /Debe permanecer al menos un SUPER_ADMIN activo/);
assert.match(userRoute, /sessionVersion = \{ increment: 1 \}/);
assert.match(userRoute, /isFederatedAdminEmail\(target\.email\)/);

assert.match(page, /requireAdminRoute\("\/admin\/usuarios"\)/);
assert.match(manager, /Revocar sesiones/);
assert.match(manager, /Audit Ledger/);

assert.match(payment, /PAYMENT_APPROVED/);
assert.match(payment, /PAYMENT_REJECTED/);
assert.match(inventory, /INVENTORY_STOCK_CHANGED/);
assert.match(whatsapp, /WHATSAPP_RUNTIME_ENABLED/);
assert.match(whatsapp, /WHATSAPP_RUNTIME_DISABLED/);
assert.match(meta, /META_REVIEW_STATE_UPDATED/);
assert.match(meta, /META_EMBEDDED_SIGNUP_CONFIG_UPDATED/);

for (const source of [usersRoute, userRoute, audit, governance, manager]) {
  assert.doesNotMatch(
    source,
    /console\.log\([^)]*(password|token)|detail:\s*\{[^}]*(password|token)/i,
    "IAM and audit surfaces must not emit credentials into telemetry.",
  );
}

console.log("Owner Governance & IAM V10 invariants: OK");
