import assert from "node:assert/strict";
import test from "node:test";

import {
  certifyCommercialSnapshot,
  expectedCommercialLifecycle,
} from "./e2e-certification";
import { canTransitionOrderStatus } from "@/lib/orders/status";
import { buildOrderTrackingSnapshot } from "@/lib/orders/tracking";

test("QR/Bre-B delivery lifecycle stays commercially coherent", () => {
  const lifecycle = expectedCommercialLifecycle({
    method: "QR_TRANSFERENCIA",
    deliveryType: "DOMICILIO",
  });

  for (const snapshot of lifecycle) {
    assert.deepEqual(certifyCommercialSnapshot(snapshot), {
      certified: true,
      issues: [],
    });
  }

  const operational = lifecycle.filter((item) =>
    ["CONFIRMADO", "EN_PREPARACION", "LISTO", "EN_CAMINO", "ENTREGADO"].includes(
      item.orderStatus,
    ),
  );

  for (let index = 0; index < operational.length - 1; index += 1) {
    assert.equal(
      canTransitionOrderStatus({
        current: operational[index].orderStatus,
        next: operational[index + 1].orderStatus,
        deliveryType: "DOMICILIO",
      }),
      true,
    );
  }
});

test("QR/Bre-B pickup lifecycle never enters EN_CAMINO", () => {
  const lifecycle = expectedCommercialLifecycle({
    method: "QR_TRANSFERENCIA",
    deliveryType: "RECOGIDA",
  });

  assert.equal(lifecycle.some((item) => item.orderStatus === "EN_CAMINO"), false);

  for (const snapshot of lifecycle) {
    assert.equal(certifyCommercialSnapshot(snapshot).certified, true);
  }
});

test("crypto lifecycle cannot be approved without evidence and confirmed tx", () => {
  const withoutEvidence = certifyCommercialSnapshot({
    method: "CRIPTO",
    paymentStatus: "APROBADO",
    orderStatus: "CONFIRMADO",
    deliveryType: "DOMICILIO",
    evidenceReceived: false,
    cryptoTxPresent: true,
    cryptoConfirmed: true,
  });
  assert.equal(withoutEvidence.certified, false);
  assert.ok(
    withoutEvidence.issues.includes("MANUAL_PAYMENT_APPROVED_WITHOUT_EVIDENCE"),
  );

  const withoutConfirmation = certifyCommercialSnapshot({
    method: "CRIPTO",
    paymentStatus: "APROBADO",
    orderStatus: "CONFIRMADO",
    deliveryType: "DOMICILIO",
    evidenceReceived: true,
    cryptoTxPresent: true,
    cryptoConfirmed: false,
  });
  assert.equal(withoutConfirmation.certified, false);
  assert.ok(
    withoutConfirmation.issues.includes(
      "CRYPTO_APPROVED_WITHOUT_ONCHAIN_CONFIRMATION",
    ),
  );
});

test("operational order cannot advance before payment approval", () => {
  const result = certifyCommercialSnapshot({
    method: "QR_TRANSFERENCIA",
    paymentStatus: "EN_VERIFICACION",
    orderStatus: "EN_PREPARACION",
    deliveryType: "DOMICILIO",
    evidenceReceived: true,
  });

  assert.equal(result.certified, false);
  assert.ok(
    result.issues.includes("OPERATIONAL_ORDER_WITHOUT_APPROVED_PAYMENT"),
  );
});

test("rejected payment forces terminal cancellation", () => {
  const result = certifyCommercialSnapshot({
    method: "QR_TRANSFERENCIA",
    paymentStatus: "RECHAZADO",
    orderStatus: "CONFIRMADO",
    deliveryType: "RECOGIDA",
    evidenceReceived: true,
  });

  assert.equal(result.certified, false);
  assert.ok(result.issues.includes("REJECTED_PAYMENT_WITH_ACTIVE_ORDER"));
});

test("tracking reflects evidence review, approval and delivery", () => {
  const reviewing = buildOrderTrackingSnapshot({
    numero: 15001,
    total: 45000,
    tipoEntrega: "DOMICILIO",
    estado: "PENDIENTE_VERIFICACION",
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:02:00.000Z",
    pago: {
      metodo: "QR_TRANSFERENCIA",
      estado: "EN_VERIFICACION",
      comprobanteRecibidoEn: "2026-09-25T00:02:00.000Z",
      verificadoEn: null,
      criptoMoneda: null,
      txHash: null,
      confirmacionesOnchain: null,
      payloadProveedor: null,
    },
  });
  assert.equal(reviewing.stage.code, "EVIDENCE_REVIEW");

  const delivered = buildOrderTrackingSnapshot({
    numero: 15001,
    total: 45000,
    tipoEntrega: "DOMICILIO",
    estado: "ENTREGADO",
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:40:00.000Z",
    pago: {
      metodo: "QR_TRANSFERENCIA",
      estado: "APROBADO",
      comprobanteRecibidoEn: "2026-09-25T00:02:00.000Z",
      verificadoEn: "2026-09-25T00:05:00.000Z",
      criptoMoneda: null,
      txHash: null,
      confirmacionesOnchain: null,
      payloadProveedor: null,
    },
  });
  assert.equal(delivered.stage.code, "DELIVERED");
  assert.equal(delivered.terminal, true);
  assert.equal(delivered.refreshAfterMs, null);
});
