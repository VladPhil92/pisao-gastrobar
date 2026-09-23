import type { CriptoMoneda } from "@/lib/payments/crypto";

export type CryptoQuote = {
  moneda: CriptoMoneda;
  copPerUnit: number;
  amount: string;
  quotedAt: string;
  provider: "coingecko";
};

const COINGECKO_IDS: Record<CriptoMoneda, string> = {
  BNB: "binancecoin",
  USDT: "tether",
  ETH: "ethereum",
  BTC: "bitcoin",
};

function decimalsFor(moneda: CriptoMoneda) {
  if (moneda === "USDT") return 6;
  if (moneda === "BTC") return 8;
  return 8;
}

function formatCryptoAmount(value: number, moneda: CriptoMoneda) {
  return value.toFixed(decimalsFor(moneda)).replace(/0+$/, "").replace(/\.$/, "");
}

export async function getCryptoQuotesCop(
  totalCop: number,
): Promise<Record<CriptoMoneda, CryptoQuote> | null> {
  if (!Number.isFinite(totalCop) || totalCop <= 0) return null;

  const ids = Object.values(COINGECKO_IDS).join(",");
  const endpoint =
    `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=cop`;

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as Record<
      string,
      { cop?: number }
    >;

    const quotedAt = new Date().toISOString();
    const result = {} as Record<CriptoMoneda, CryptoQuote>;

    for (const moneda of Object.keys(COINGECKO_IDS) as CriptoMoneda[]) {
      const copPerUnit = Number(payload[COINGECKO_IDS[moneda]]?.cop);
      if (!Number.isFinite(copPerUnit) || copPerUnit <= 0) return null;
      result[moneda] = {
        moneda,
        copPerUnit,
        amount: formatCryptoAmount(totalCop / copPerUnit, moneda),
        quotedAt,
        provider: "coingecko",
      };
    }

    return result;
  } catch {
    return null;
  }
}

export function cryptoAmountSufficiency(input: {
  expectedAmount?: string | null;
  receivedAmount: string;
  tolerancePercent?: number;
}) {
  const expected = Number(input.expectedAmount);
  const received = Number(input.receivedAmount);
  const tolerancePercent = Math.max(
    0,
    Number(input.tolerancePercent ?? process.env.CRYPTO_UNDERPAY_TOLERANCE_PERCENT ?? 1),
  );

  if (!Number.isFinite(expected) || expected <= 0) {
    return {
      available: false,
      sufficient: null as boolean | null,
      expectedAmount: null,
      receivedAmount: input.receivedAmount,
      minimumAcceptedAmount: null,
      tolerancePercent,
      variancePercent: null,
    };
  }

  const minimumAccepted = expected * (1 - tolerancePercent / 100);
  const variancePercent = ((received - expected) / expected) * 100;

  return {
    available: true,
    sufficient: received >= minimumAccepted,
    expectedAmount: input.expectedAmount ?? null,
    receivedAmount: input.receivedAmount,
    minimumAcceptedAmount: minimumAccepted.toFixed(10).replace(/0+$/, "").replace(/\.$/, ""),
    tolerancePercent,
    variancePercent,
  };
}
