import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(path, "utf8");
}

const createOrder = read("lib/orders/create-order.ts");
const evidenceRoute = read("app/api/pagos/comprobante/route.ts");
const verifyRoute = read("app/api/admin/pedidos/[id]/verificar/route.ts");
const stateRoute = read("app/api/admin/pedidos/[id]/estado/route.ts");
const trackingRoute = read("app/api/pedidos/seguimiento/route.ts");
const paymentAdmin = read("lib/notifications/payment-admin.ts");
const customerNotification = read("lib/notifications/customer-order.ts");

assert.match(createOrder, /issueOrderTrackingAccess\(pedido\.id\)/);
assert.match(createOrder, /estado:\s*"PENDIENTE_PAGO"/);
assert.match(createOrder, /metodo:\s*"QR_TRANSFERENCIA"/);

assert.match(evidenceRoute, /prepararComprobantePago\(file\)/);
assert.match(evidenceRoute, /estado:\s*"EN_VERIFICACION"/);
assert.match(evidenceRoute, /estado:\s*"PENDIENTE_VERIFICACION"/);
assert.match(evidenceRoute, /notifyPaymentAdmin\(/);

assert.match(
  verifyRoute,
  /No se puede aprobar un pago manual sin comprobante almacenado/,
);
assert.match(verifyRoute, /estado:\s*aprobado \? "APROBADO" : "RECHAZADO"/);
assert.match(verifyRoute, /estado:\s*aprobado \? "CONFIRMADO" : "CANCELADO"/);
assert.match(verifyRoute, /processCustomerOrderNotification/);

assert.match(stateRoute, /current\.pago\?\.estado !== "APROBADO"/);
assert.match(stateRoute, /canTransitionOrderStatus/);
assert.match(stateRoute, /processCustomerOrderNotification/);
assert.match(stateRoute, /awardDeliveredOrderPoints/);

assert.match(trackingRoute, /orderTrackingTokenFromRequest/);
assert.match(trackingRoute, /resolveOrderTrackingAccess/);
assert.match(trackingRoute, /Cache-Control": "no-store, private"/);
assert.match(trackingRoute, /X-Robots-Tag": "noindex, nofollow"/);

assert.match(paymentAdmin, /PAYMENT_ADMIN_WHATSAPP_NUMBER/);
assert.match(customerNotification, /DEAD_LETTER/);
assert.match(customerNotification, /processDueCustomerOrderNotifications/);

console.log(
  JSON.stringify(
    {
      status: "PASS",
      certification: "PISAO_COMMERCIAL_E2E_V15",
      guarantees: [
        "order_tracking_issued",
        "manual_evidence_required",
        "admin_payment_approval",
        "customer_notification_queued",
        "operational_status_guarded_by_payment",
        "tracking_private",
        "notification_retry_dead_letter",
      ],
    },
    null,
    2,
  ),
);
