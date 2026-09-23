export type SupportedCryptoAsset = "USDT" | "BNB" | "ETH" | "BTC";

export type CryptoOperationsPaymentInput = {
  id: string;
  estado: "PENDIENTE" | "EN_VERIFICACION" | "APROBADO" | "RECHAZADO";
  montoCop: number;
  descuentoCop: number;
  descuentoPct: number | null;
  criptoMoneda: string | null;
  txHash: string | null;
  confirmacionesOnchain: number | null;
  payloadProveedor: unknown;
  pedidoNumero: number;
  createdAt: Date | string;
  verificadoEn: Date | string | null;
};

type JsonObject = Record<string, unknown>;

export type CryptoLedgerEntry = {
  paymentId: string;
  pedidoNumero: number;
  asset: SupportedCryptoAsset | null;
  estado: CryptoOperationsPaymentInput["estado"];
  revenueCop: number;
  discountCop: number;
  discountPct: number | null;
  receivedAmount: number | null;
  network: string | null;
  txHash: string | null;
  confirmations: number;
  reconciliationState: string | null;
  quoteCopPerUnit: number | null;
  quotedAt: string | null;
  bookedAt: string | null;
  ledgerVersion: string | null;
  traceable: boolean;
  createdAt: string;
};

export type CryptoOperationsSummary = {
  approvedOrders: number;
  approvedRevenueCop: number;
  averageTicketCop: number;
  discountCop: number;
  stablecoinRevenueSharePct: number;
  traceabilityCoveragePct: number;
  quoteCoveragePct: number;
  ledgerSnapshotCoveragePct: number;
  pending: {
    total: number;
    observed: number;
    confirmedAwaitingApproval: number;
    underpaid: number;
    retryPending: number;
    withoutTx: number;
  };
  assets: Array<{
    asset: SupportedCryptoAsset;
    orders: number;
    revenueCop: number;
    receivedUnits: number;
    averageTicketCop: number;
    discountCop: number;
  }>;
  recentApproved: CryptoLedgerEntry[];
};

const ASSETS: SupportedCryptoAsset[] = ["USDT", "BNB", "ETH", "BTC"];

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asIso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeAsset(value: string | null): SupportedCryptoAsset | null {
  const normalized = value?.trim().toUpperCase();
  return ASSETS.includes(normalized as SupportedCryptoAsset)
    ? (normalized as SupportedCryptoAsset)
    : null;
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function extractCryptoLedgerEntry(
  input: CryptoOperationsPaymentInput,
): CryptoLedgerEntry {
  const payload = asObject(input.payloadProveedor);
  const reconciliation = asObject(payload.reconciliation);
  const treasury = asObject(payload.treasury);
  const asset = normalizeAsset(
    asString(treasury.asset) ?? input.criptoMoneda,
  );

  const quotes = asObject(payload.quotes);
  const selectedQuote = asset ? asObject(quotes[asset]) : {};
  const quoteCopPerUnit =
    asNumber(treasury.quoteCopPerUnit) ??
    asNumber(selectedQuote.copPerUnit);

  const receivedAmount =
    asNumber(treasury.receivedAmount) ??
    asNumber(reconciliation.amount) ??
    asNumber(payload.amount);

  const network =
    asString(treasury.network) ??
    asString(reconciliation.network) ??
    asString(payload.network);

  const reconciliationState =
    asString(reconciliation.state) ?? asString(payload.status);

  const confirmations =
    asNumber(treasury.confirmations) ??
    asNumber(reconciliation.confirmations) ??
    input.confirmacionesOnchain ??
    0;

  const txHash = asString(treasury.txHash) ?? input.txHash;

  return {
    paymentId: input.id,
    pedidoNumero: input.pedidoNumero,
    asset,
    estado: input.estado,
    revenueCop: Math.max(0, input.montoCop),
    discountCop: Math.max(0, input.descuentoCop),
    discountPct:
      input.descuentoPct !== null && Number.isFinite(input.descuentoPct)
        ? input.descuentoPct
        : null,
    receivedAmount:
      receivedAmount !== null && receivedAmount >= 0 ? receivedAmount : null,
    network,
    txHash,
    confirmations: Math.max(0, Math.trunc(confirmations)),
    reconciliationState,
    quoteCopPerUnit:
      quoteCopPerUnit !== null && quoteCopPerUnit > 0
        ? quoteCopPerUnit
        : null,
    quotedAt:
      asString(treasury.quotedAt) ?? asString(selectedQuote.quotedAt),
    bookedAt: asString(treasury.bookedAt) ?? asIso(input.verificadoEn),
    ledgerVersion: asString(treasury.ledgerVersion),
    traceable: Boolean(txHash && receivedAmount !== null && receivedAmount > 0),
    createdAt: asIso(input.createdAt) ?? new Date(0).toISOString(),
  };
}

export function buildCryptoOperationsSummary(
  inputs: CryptoOperationsPaymentInput[],
): CryptoOperationsSummary {
  const entries = inputs.map(extractCryptoLedgerEntry);
  const approved = entries.filter((entry) => entry.estado === "APROBADO");
  const pending = entries.filter(
    (entry) => entry.estado === "PENDIENTE" || entry.estado === "EN_VERIFICACION",
  );

  const approvedRevenueCop = approved.reduce(
    (sum, entry) => sum + entry.revenueCop,
    0,
  );
  const discountCop = approved.reduce(
    (sum, entry) => sum + entry.discountCop,
    0,
  );

  const assets = ASSETS.map((asset) => {
    const rows = approved.filter((entry) => entry.asset === asset);
    const revenueCop = rows.reduce((sum, entry) => sum + entry.revenueCop, 0);
    const receivedUnits = rows.reduce(
      (sum, entry) => sum + (entry.receivedAmount ?? 0),
      0,
    );
    const assetDiscount = rows.reduce(
      (sum, entry) => sum + entry.discountCop,
      0,
    );

    return {
      asset,
      orders: rows.length,
      revenueCop,
      receivedUnits,
      averageTicketCop: rows.length ? revenueCop / rows.length : 0,
      discountCop: assetDiscount,
    };
  });

  const usdtRevenue =
    assets.find((item) => item.asset === "USDT")?.revenueCop ?? 0;

  return {
    approvedOrders: approved.length,
    approvedRevenueCop,
    averageTicketCop: approved.length
      ? approvedRevenueCop / approved.length
      : 0,
    discountCop,
    stablecoinRevenueSharePct: percent(usdtRevenue, approvedRevenueCop),
    traceabilityCoveragePct: percent(
      approved.filter((entry) => entry.traceable).length,
      approved.length,
    ),
    quoteCoveragePct: percent(
      approved.filter((entry) => entry.quoteCopPerUnit !== null).length,
      approved.length,
    ),
    ledgerSnapshotCoveragePct: percent(
      approved.filter(
        (entry) => entry.ledgerVersion === "PISAO_CRYPTO_TREASURY_V13",
      ).length,
      approved.length,
    ),
    pending: {
      total: pending.length,
      observed: pending.filter(
        (entry) => entry.reconciliationState === "OBSERVED",
      ).length,
      confirmedAwaitingApproval: pending.filter(
        (entry) => entry.reconciliationState === "CONFIRMED",
      ).length,
      underpaid: pending.filter(
        (entry) => entry.reconciliationState === "UNDERPAID",
      ).length,
      retryPending: pending.filter(
        (entry) => entry.reconciliationState === "RETRY_PENDING",
      ).length,
      withoutTx: pending.filter((entry) => !entry.txHash).length,
    },
    assets,
    recentApproved: approved
      .slice()
      .sort(
        (a, b) =>
          new Date(b.bookedAt ?? b.createdAt).getTime() -
          new Date(a.bookedAt ?? a.createdAt).getTime(),
      )
      .slice(0, 12),
  };
}
