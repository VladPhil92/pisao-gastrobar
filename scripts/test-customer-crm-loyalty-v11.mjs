import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const schema = read("prisma/schema.prisma");
const migration = read(
  "prisma/migrations/20260924193000_customer_crm_loyalty_v11/migration.sql",
);
const identity = read("lib/crm/customer-identity.ts");
const loyalty = read("lib/crm/loyalty.ts");
const dashboard = read("lib/crm/dashboard.ts");
const orderCreate = read("lib/orders/create-order.ts");
const reservationCreate = read("lib/reservas/create-reservation.ts");
const orderStatus = read("app/api/admin/pedidos/[id]/estado/route.ts");
const register = read("app/api/account/register/route.ts");
const login = read("app/api/account/login/route.ts");
const ctg = read("app/auth/ctgone/callback/route.ts");
const account = read("app/(site)/micuenta/page.tsx");
const roles = read("lib/auth/roles.ts");
const sidebar = read("components/admin/AdminSidebar.tsx");
const crmPage = read("app/admin/(protected)/clientes/page.tsx");
const crmDetail = read("app/admin/(protected)/clientes/[id]/page.tsx");

assert.match(schema, /model CrmCustomerProfile/);
assert.match(schema, /model CustomerLoyaltyEntry/);
assert.match(schema, /customerProfileId String\?/);
assert.match(migration, /Fidelización histórica/);
assert.match(migration, /ORDER_DELIVERED/);

assert.match(identity, /email:\$\{email\}/);
assert.match(identity, /phone:\$\{phone\}/);
assert.match(identity, /input\.source === "CTG_ONE"/);
assert.match(orderCreate, /customerProfileId: customerProfile\?\.id/);
assert.match(reservationCreate, /customerProfileId: customerProfile\.id/);
assert.match(register, /accountClienteId: cliente\.id/);
assert.match(login, /resolveCrmCustomerProfile/);
assert.match(ctg, /source: "CTG_ONE"/);

assert.match(loyalty, /redemptionEnabled: false/);
assert.match(loyalty, /pointsPer1000Cop: 1/);
assert.match(loyalty, /order\.estado !== "ENTREGADO"/);
assert.match(loyalty, /order\.pago\?\.estado !== "APROBADO"/);
assert.match(loyalty, /eventKey = `order:\$\{order\.id\}:delivered`/);
assert.match(orderStatus, /awardDeliveredOrderPoints/);

assert.match(dashboard, /segmentForDeliveredOrders/);
assert.match(crmPage, /Customer CRM & Loyalty V11/);
assert.match(crmDetail, /Customer 360/);
assert.match(account, /PISÁO Points/);
assert.match(account, /El canje todavía no está habilitado/);
assert.match(roles, /"\/admin\/clientes": ALL_ADMIN/);
assert.match(sidebar, /href: "\/admin\/clientes"/);

for (const source of [identity, loyalty, dashboard, crmPage, crmDetail]) {
  assert.doesNotMatch(
    source,
    /passwordHash|accessTokenCiphertext|WHATSAPP_META_APP_SECRET/,
    "CRM surfaces must not expose credentials or integration secrets.",
  );
}

console.log("Customer CRM & Loyalty V11 invariants: OK");
