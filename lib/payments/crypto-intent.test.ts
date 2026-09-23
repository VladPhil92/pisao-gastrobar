import { describe, expect, it } from "vitest";
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
    expect(intent.state).toBe("QUOTE_CREATED");
    expect(intent.quotes.USDT).toMatchObject({ amount: "4.5" });
    expect(cryptoIntentExpired(intent, now)).toBe(false);
  });

  it("does not settle before required confirmations", () => {
    expect(settlementState({
      confirmations: 1,
      requiredConfirmations: 2,
      sufficient: true,
      variancePercent: 0,
    })).toBe("CONFIRMING");
  });

  it("marks sufficient confirmed payment as paid", () => {
    expect(settlementState({
      confirmations: 2,
      requiredConfirmations: 2,
      sufficient: true,
      variancePercent: 0,
    })).toBe("PAID");
  });

  it("routes underpayments and unknown quotes away from paid", () => {
    expect(settlementState({
      confirmations: 10,
      requiredConfirmations: 2,
      sufficient: false,
      variancePercent: -8,
    })).toBe("UNDERPAID");
    expect(settlementState({
      confirmations: 10,
      requiredConfirmations: 2,
      sufficient: null,
      variancePercent: null,
    })).toBe("MANUAL_REVIEW");
  });
});
