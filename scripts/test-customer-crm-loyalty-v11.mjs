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
const lifecycle = read("lib/crm/lifecycle-core.ts");
const conciergeLifecycle = read("lib/crm/concierge-lifecycle-core.ts");
const conciergeContext = read("lib/crm/concierge-context.ts");
const conciergeRoute = read("app/api/ai/concierge/route.ts");
const contextualCommerce = read("lib/revenue/contextual-commerce-core.ts");
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
assert.match(dashboard, /classifyCustomerLifecycle/);
assert.match(lifecycle, /CUSTOMER_LIFECYCLE_ENGINE_VERSION/);
assert.match(lifecycle, /outreachAllowed/);
assert.match(lifecycle, /marketingConsent && input\.hasContact/);
assert.match(conciergeLifecycle, /CONCIERGE_LIFECYCLE_VERSION/);
assert.match(conciergeLifecycle, /ONSITE ONLY/);
assert.match(conciergeLifecycle, /no autoriza contacto saliente/);
assert.match(conciergeLifecycle, /No inventes descuentos, regalos, privilegios/);
assert.match(conciergeContext, /readCustomerLocalSession/);
assert.match(conciergeContext, /readCustomerSession/);
assert.match(conciergeContext, /estado: "ENTREGADO"/);
assert.match(conciergeContext, /estado: "APROBADO"/);
assert.match(conciergeRoute, /AUTHENTICATED CUSTOMER PERSONALIZATION/);
assert.match(conciergeRoute, /getAuthenticatedConciergeLifecycleContext/);
assert.match(conciergeRoute, /outbound_authorized: false/);
assert.match(conciergeLifecycle, /signals:/);
assert.match(contextualCommerce, /CONTEXTUAL_COMMERCE_VERSION/);
assert.match(contextualCommerce, /ONE OPTIONAL NEXT BEST ACTION/);
assert.match(contextualCommerce, /controlled_revenue_layer/);
assert.match(contextualCommerce, /No agregues productos al carrito/);
assert.match(conciergeRoute, /buildContextualCommerceGuidance/);
assert.match(conciergeRoute, /pisao\.concierge\.next_best_action/);
assert.match(conciergeRoute, /autonomous_discount: false/);
assert.match(crmPage, /Customer Lifecycle Operations V16/);
assert.match(crmPage, /Sin contacto saliente/);
assert.match(crmDetail, /Customer 360/);
assert.match(account, /PISÁO Points/);
assert.match(account, /El canje todavía no está habilitado/);
assert.match(roles, /"\/admin\/clientes": ALL_ADMIN/);
assert.match(sidebar, /href: "\/admin\/clientes"/);

for (const source of [
  identity,
  loyalty,
  dashboard,
  lifecycle,
  conciergeLifecycle,
  contextualCommerce,
  conciergeRoute,
  crmPage,
  crmDetail,
]) {
  assert.doesNotMatch(
    source,
    /passwordHash|accessTokenCiphertext|WHATSAPP_META_APP_SECRET/,
    "CRM surfaces must not expose credentials or integration secrets.",
  );
}

console.log("Customer CRM V11 + Lifecycle V16 + Concierge V17 + Contextual Commerce V18 invariants: OK");
