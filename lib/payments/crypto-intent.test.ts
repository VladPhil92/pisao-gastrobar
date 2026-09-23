import { describe, expect, it } from "node:test";
import assert from "node:assert/strict";
import {
  createCryptoPaymentIntent,
  cryptoIntentExpired,
  settlementState,
} from "./crypto-intent";

describe("crypto payment rail v3", () => {
  it("creates an expiring payment intent with locked quotes", () => {
    const now = new Date("2026-09-23T12:00:00.000Z");
    const intent = createCryptoPaymentIntent({
      pedidoId: "pedido-1",
      numeroPedido: 42,
      totalCop: 18000,
      now,
      options: [{
        moneda: "USDT",
        red: "BNB Smart Chain (BEP20)",
        direccion: "0xabc",
        qrImageUrl: "/QR/crypto/USDT.png",
        quote: {
          moneda: "USDT",
          copPerUnit: 4000,
          amount: "4.5",
          quotedAt: now.toISOString(),
          provider: "coingecko",
        },
      }],
    });
    assert.equal(intent.state, "QUOTE_CREATED");
    assert.equal(intent.quotes.USDT?.amount, "4.5");
    assert.equal(cryptoIntentExpired(intent, now), false);
  });

  it("does not settle before required confirmations", () => {
    assert.equal(settlementState({
      confirmations: 1,
      requiredConfirmations: 2,
      sufficient: true,
      variancePercent: 0,
    }), "CONFIRMING");
  });

  it("marks sufficient confirmed payment as paid", () => {
    assert.equal(settlementState({
      confirmations: 2,
      requiredConfirmations: 2,
      sufficient: true,
      variancePercent: 0,
    }), "PAID");
  });

  it("routes underpayments and unknown quotes away from paid", () => {
    assert.equal(settlementState({
      confirmations: 10,
      requiredConfirmations: 2,
      sufficient: false,
      variancePercent: -8,
    }), "UNDERPAID");
    assert.equal(settlementState({
      confirmations: 10,
      requiredConfirmations: 2,
      sufficient: null,
      variancePercent: null,
    }), "MANUAL_REVIEW");
  });
});
