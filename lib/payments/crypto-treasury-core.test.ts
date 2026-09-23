import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCryptoOperationsSummary,
  extractCryptoLedgerEntry,
  type CryptoOperationsPaymentInput,
} from "./crypto-treasury-core";

function payment(
  partial: Partial<CryptoOperationsPaymentInput> = {},
): CryptoOperationsPaymentInput {
  return {
    id: "pay-1",
    estado: "APROBADO",
    montoCop: 95000,
    descuentoCop: 5000,
    descuentoPct: 5,
    criptoMoneda: "USDT",
    txHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    confirmacionesOnchain: 4,
    payloadProveedor: {
      quotes: {
        USDT: {
          copPerUnit: 4000,
          amount: "23.75",
          quotedAt: "2026-09-23T20:00:00.000Z",
        },
      },
      amount: "23.75",
      network: "BNB Smart Chain (BEP20)",
      explorerUrl: "https://bscscan.com/tx/example",
      reconciliation: { state: "CONFIRMED" },
      treasury: {
        ledgerVersion: "PISAO_CRYPTO_TREASURY_V13",
        bookedAt: "2026-09-23T20:05:00.000Z",
        asset: "USDT",
        receivedAmount: "23.75",
      },
    },
    pedidoNumero: 101,
    createdAt: "2026-09-23T20:00:00.000Z",
    verificadoEn: "2026-09-23T20:05:00.000Z",
    ...partial,
  };
}

test("extracts the approval-time crypto ledger snapshot", () => {
  const entry = extractCryptoLedgerEntry(payment());

  assert.equal(entry.asset, "USDT");
  assert.equal(entry.receivedAmount, 23.75);
  assert.equal(entry.quoteCopPerUnit, 4000);
  assert.equal(entry.traceable, true);
  assert.equal(entry.ledgerVersion, "PISAO_CRYPTO_TREASURY_V13");
});

test("keeps historical approved payments visible without inventing a V13 snapshot", () => {
  const entry = extractCryptoLedgerEntry(
    payment({
      payloadProveedor: {
        amount: "0.005",
        network: "Bitcoin",
        reconciliation: {
          state: "CONFIRMED",
          explorerUrl: "https://mempool.space/tx/example",
        },
      },
      criptoMoneda: "BTC",
    }),
  );

  assert.equal(entry.asset, "BTC");
  assert.equal(entry.receivedAmount, 0.005);
  assert.equal(entry.ledgerVersion, null);
  assert.equal(entry.traceable, true);
});

test("summarizes approved revenue and stablecoin share without treating pending as sales", () => {
  const summary = buildCryptoOperationsSummary([
    payment(),
    payment({
      id: "pay-2",
      montoCop: 50000,
      descuentoCop: 2500,
      criptoMoneda: "ETH",
      payloadProveedor: {
        amount: "0.004",
        reconciliation: { state: "CONFIRMED" },
      },
      pedidoNumero: 102,
    }),
    payment({
      id: "pay-3",
      estado: "EN_VERIFICACION",
      montoCop: 120000,
      criptoMoneda: "BNB",
      payloadProveedor: {
        reconciliation: { state: "OBSERVED" },
      },
      pedidoNumero: 103,
    }),
  ]);

  assert.equal(summary.approvedOrders, 2);
  assert.equal(summary.approvedRevenueCop, 145000);
  assert.equal(summary.pending.total, 1);
  assert.equal(summary.pending.observed, 1);
  assert.equal(summary.stablecoinRevenueSharePct, 65.5);
});

test("surfaces confirmed-awaiting-approval, underpayment and missing Tx separately", () => {
  const summary = buildCryptoOperationsSummary([
    payment({
      id: "p1",
      estado: "EN_VERIFICACION",
      payloadProveedor: { reconciliation: { state: "CONFIRMED" } },
    }),
    payment({
      id: "p2",
      estado: "EN_VERIFICACION",
      payloadProveedor: { reconciliation: { state: "UNDERPAID" } },
    }),
    payment({
      id: "p3",
      estado: "PENDIENTE",
      txHash: null,
      payloadProveedor: null,
    }),
  ]);

  assert.equal(summary.pending.total, 3);
  assert.equal(summary.pending.confirmedAwaitingApproval, 1);
  assert.equal(summary.pending.underpaid, 1);
  assert.equal(summary.pending.withoutTx, 1);
});
