import { randomUUID } from "crypto";
import type { CryptoPaymentDestination } from "@/lib/payments/crypto";

export const CRYPTO_QUOTE_TTL_SECONDS = Math.max(
  60,
  Number(process.env.CRYPTO_QUOTE_TTL_SECONDS ?? 600),
);

export type CryptoPaymentState =
  | "QUOTE_CREATED"
  | "AWAITING_TX"
  | "TX_DETECTED"
  | "CONFIRMING"
  | "PAID"
  | "UNDERPAID"
  | "OVERPAID"
  | "EXPIRED"
  | "MANUAL_REVIEW"
  | "REFUNDED";

export type CryptoPaymentIntent = {
  version: "PISAO_CRYPTO_PAYMENT_INTENT_V3";
  intentId: string;
  pedidoId: string;
  numeroPedido: number;
  totalCop: number;
  state: CryptoPaymentState;
  createdAt: string;
  expiresAt: string;
  quoteTtlSeconds: number;
  selectedAsset: string | null;
  quotes: Record<string, null | { copPerUnit: number; amount: string; provider: string; quotedAt: string }>;
};

export function createCryptoPaymentIntent(input: {
  pedidoId: string;
  numeroPedido: number;
  totalCop: number;
  options: CryptoPaymentDestination[];
  now?: Date;
}): CryptoPaymentIntent {
  const now = input.now ?? new Date();
  const expiresAt = new Date(now.getTime() + CRYPTO_QUOTE_TTL_SECONDS * 1000);
  return {
    version: "PISAO_CRYPTO_PAYMENT_INTENT_V3",
    intentId: randomUUID(),
    pedidoId: input.pedidoId,
    numeroPedido: input.numeroPedido,
    totalCop: input.totalCop,
    state: "QUOTE_CREATED",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    quoteTtlSeconds: CRYPTO_QUOTE_TTL_SECONDS,
    selectedAsset: null,
    quotes: Object.fromEntries(
      input.options.map((option) => [
        option.moneda,
        option.quote
          ? {
              copPerUnit: option.quote.copPerUnit,
              amount: option.quote.amount,
              provider: option.quote.provider,
              quotedAt: option.quote.quotedAt,
            }
          : null,
      ]),
    ),
  };
}

export function cryptoIntentExpired(intent: Pick<CryptoPaymentIntent, "expiresAt">, now = new Date()) {
  return now.getTime() >= new Date(intent.expiresAt).getTime();
}

export function settlementState(input: {
  confirmations: number;
  requiredConfirmations: number;
  sufficient: boolean | null;
  variancePercent: number | null;
}): CryptoPaymentState {
  if (input.sufficient === false) return "UNDERPAID";
  if (input.sufficient === null) return "MANUAL_REVIEW";
  if (input.confirmations < input.requiredConfirmations) return "CONFIRMING";
  if ((input.variancePercent ?? 0) > Number(process.env.CRYPTO_OVERPAY_REVIEW_PERCENT ?? 5)) {
    return "OVERPAID";
  }
  return "PAID";
}
