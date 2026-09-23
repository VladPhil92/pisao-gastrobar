import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOrderTrackingSnapshot,
  maskTransactionHash,
  normalizeCustomerPhone,
} from "./tracking";

const baseOrder = {
  numero: 321,
  total: 58000,
  tipoEntrega: "RECOGIDA" as const,
  estado: "PENDIENTE_PAGO" as const,
  createdAt: "2026-09-23T19:00:00.000Z",
  updatedAt: "2026-09-23T19:00:00.000Z",
};

test("normalizes Colombian phone variants for cross-device recovery", () => {
  assert.equal(normalizeCustomerPhone("+57 318 642 8218"), "3186428218");
  assert.equal(normalizeCustomerPhone("318-642-8218"), "3186428218");
  assert.equal(normalizeCustomerPhone("0057 318 642 8218"), "3186428218");
});

test("masks transaction hashes without exposing the full identifier", () => {
  const hash =
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  assert.equal(maskTransactionHash(hash), "0x12345678…90abcdef");
});

test("shows QR evidence as pending administrative review", () => {
  const snapshot = buildOrderTrackingSnapshot({
    ...baseOrder,
    estado: "PENDIENTE_VERIFICACION",
    pago: {
      metodo: "QR_TRANSFERENCIA",
      estado: "EN_VERIFICACION",
      comprobanteRecibidoEn: "2026-09-23T19:05:00.000Z",
      verificadoEn: null,
      criptoMoneda: null,
      txHash: null,
      confirmacionesOnchain: null,
      payloadProveedor: null,
    },
  });

  assert.equal(snapshot.stage.code, "EVIDENCE_REVIEW");
  assert.equal(snapshot.payment?.evidenceReceived, true);
  assert.equal(snapshot.terminal, false);
});

test("shows an observed crypto transaction while confirmations accumulate", () => {
  const snapshot = buildOrderTrackingSnapshot({
    ...baseOrder,
    pago: {
      metodo: "CRIPTO",
      estado: "EN_VERIFICACION",
      comprobanteRecibidoEn: "2026-09-23T19:05:00.000Z",
      verificadoEn: null,
      criptoMoneda: "ETH",
      txHash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      confirmacionesOnchain: 1,
      payloadProveedor: {
        reconciliation: {
          state: "OBSERVED",
          network: "Ethereum",
          confirmations: 1,
          requiredConfirmations: 2,
          amount: "0.0042",
          explorerUrl: "https://example.invalid/tx/1",
        },
      },
    },
  });

  assert.equal(snapshot.stage.code, "CRYPTO_OBSERVED");
  assert.equal(snapshot.payment?.crypto?.requiredConfirmations, 2);
  assert.equal(snapshot.payment?.crypto?.confirmations, 1);
});

test("surfaces crypto underpayment as an issue instead of payment success", () => {
  const snapshot = buildOrderTrackingSnapshot({
    ...baseOrder,
    pago: {
      metodo: "CRIPTO",
      estado: "EN_VERIFICACION",
      comprobanteRecibidoEn: "2026-09-23T19:05:00.000Z",
      verificadoEn: null,
      criptoMoneda: "USDT",
      txHash: "0xunderpaid0000000000000000000000000000000000000000000000000000",
      confirmacionesOnchain: 10,
      payloadProveedor: {
        reconciliation: {
          state: "UNDERPAID",
          confirmations: 10,
          requiredConfirmations: 3,
          amount: "10.00",
        },
      },
    },
  });

  assert.equal(snapshot.stage.code, "CRYPTO_UNDERPAID");
  assert.equal(snapshot.stage.tone, "issue");
  assert.equal(
    snapshot.timeline.some((item) => item.state === "issue"),
    true,
  );
});

test("marks delivered orders terminal and stops automatic refresh", () => {
  const snapshot = buildOrderTrackingSnapshot({
    ...baseOrder,
    tipoEntrega: "DOMICILIO",
    estado: "ENTREGADO",
    pago: {
      metodo: "QR_TRANSFERENCIA",
      estado: "APROBADO",
      comprobanteRecibidoEn: "2026-09-23T19:05:00.000Z",
      verificadoEn: "2026-09-23T19:07:00.000Z",
      criptoMoneda: null,
      txHash: null,
      confirmacionesOnchain: null,
      payloadProveedor: null,
    },
  });

  assert.equal(snapshot.stage.code, "DELIVERED");
  assert.equal(snapshot.terminal, true);
  assert.equal(snapshot.refreshAfterMs, null);
  assert.equal(
    snapshot.timeline.at(-1)?.state,
    "complete",
  );
});
