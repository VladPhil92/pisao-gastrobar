export type OnchainCrypto = "BNB" | "USDT" | "ETH" | "BTC";

export type OnchainVerification = {
  verified: boolean;
  status: "OBSERVED" | "CONFIRMED";
  moneda: OnchainCrypto;
  red: string;
  txHash: string;
  recipient: string;
  amount: string;
  confirmations: number;
  requiredConfirmations: number;
  explorerUrl: string;
  blockNumber: number | null;
};

export class OnchainVerificationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_HASH"
      | "TX_NOT_FOUND"
      | "TX_FAILED"
      | "WRONG_RECIPIENT"
      | "WRONG_TOKEN"
      | "NO_VALUE"
      | "PROVIDER_UNAVAILABLE",
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "OnchainVerificationError";
  }
}

const DEFAULT_BSC_RPC = "https://bsc-dataseed.binance.org";
const DEFAULT_ETH_RPC = "https://ethereum-rpc.publicnode.com";
const DEFAULT_BTC_API = "https://blockstream.info/api";

const DEFAULT_USDT_BSC_CONTRACT =
  "0x55d398326f99059ff775485246999027b3197955";
const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function hexToNumber(value: string | null | undefined) {
  if (!value) return null;
  return Number.parseInt(value, 16);
}

function formatUnits(value: bigint, decimals: number) {
  const raw = value.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals) || "0";
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function normalizeEvmAddress(value: string | null | undefined) {
  return value?.toLowerCase() ?? "";
}

export function normalizeCryptoTransactionHash(
  moneda: OnchainCrypto,
  value: string,
) {
  const txHash = value.trim();
  if (moneda === "BTC") {
    if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
      throw new OnchainVerificationError(
        "El TxID de Bitcoin debe tener 64 caracteres hexadecimales.",
        "INVALID_HASH",
      );
    }
    return txHash.toLowerCase();
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new OnchainVerificationError(
      "El hash de transacción debe comenzar por 0x y tener 64 caracteres hexadecimales.",
      "INVALID_HASH",
    );
  }
  return txHash.toLowerCase();
}

export function cryptoExplorerUrl(moneda: OnchainCrypto, txHash: string) {
  const normalized = normalizeCryptoTransactionHash(moneda, txHash);
  if (moneda === "BTC") {
    return `https://mempool.space/tx/${normalized}`;
  }
  if (moneda === "ETH") {
    return `https://etherscan.io/tx/${normalized}`;
  }
  return `https://bscscan.com/tx/${normalized}`;
}

function requiredConfirmations(moneda: OnchainCrypto) {
  if (moneda === "BTC") {
    return Math.max(0, Number(process.env.CRYPTO_BTC_CONFIRMATIONS ?? 1));
  }
  if (moneda === "ETH") {
    return Math.max(0, Number(process.env.CRYPTO_ETH_CONFIRMATIONS ?? 2));
  }
  return Math.max(0, Number(process.env.CRYPTO_BSC_CONFIRMATIONS ?? 2));
}

async function rpcCall<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new OnchainVerificationError(
      "La red blockchain no respondió a tiempo. Intenta nuevamente.",
      "PROVIDER_UNAVAILABLE",
      true,
    );
  }

  if (!response.ok) {
    throw new OnchainVerificationError(
      "No fue posible consultar la red blockchain en este momento.",
      "PROVIDER_UNAVAILABLE",
      true,
    );
  }

  const payload = (await response.json()) as {
    result?: T | null;
    error?: { message?: string };
  };

  if (payload.error) {
    throw new OnchainVerificationError(
      payload.error.message || "El proveedor blockchain rechazó la consulta.",
      "PROVIDER_UNAVAILABLE",
      true,
    );
  }

  return payload.result ?? null;
}

type EvmTransaction = {
  to?: string | null;
  value?: string | null;
  blockNumber?: string | null;
};

type EvmReceipt = {
  status?: string | null;
  blockNumber?: string | null;
  logs?: Array<{
    address?: string;
    topics?: string[];
    data?: string;
  }>;
};

async function getEvmConfirmations(
  rpcUrl: string,
  blockNumberHex: string | null | undefined,
) {
  const blockNumber = hexToNumber(blockNumberHex);
  if (blockNumber === null) {
    return { blockNumber: null, confirmations: 0 };
  }

  const latestHex = await rpcCall<string>(rpcUrl, "eth_blockNumber", []);
  const latest = hexToNumber(latestHex);
  if (latest === null || latest < blockNumber) {
    return { blockNumber, confirmations: 0 };
  }

  return {
    blockNumber,
    confirmations: latest - blockNumber + 1,
  };
}

async function verifyNativeEvm(
  moneda: "BNB" | "ETH",
  txHash: string,
  wallet: string,
): Promise<OnchainVerification> {
  const rpcUrl =
    moneda === "BNB"
      ? process.env.BSC_RPC_URL?.trim() || DEFAULT_BSC_RPC
      : process.env.ETH_RPC_URL?.trim() || DEFAULT_ETH_RPC;

  const tx = await rpcCall<EvmTransaction>(
    rpcUrl,
    "eth_getTransactionByHash",
    [txHash],
  );

  if (!tx) {
    throw new OnchainVerificationError(
      "La transacción todavía no aparece en la red indicada.",
      "TX_NOT_FOUND",
      true,
    );
  }

  if (normalizeEvmAddress(tx.to) !== normalizeEvmAddress(wallet)) {
    throw new OnchainVerificationError(
      "La transacción no fue enviada a la dirección de PISÁO.",
      "WRONG_RECIPIENT",
    );
  }

  const value = BigInt(tx.value || "0x0");
  if (value <= 0n) {
    throw new OnchainVerificationError(
      "La transacción no contiene un valor recibido válido.",
      "NO_VALUE",
    );
  }

  const receipt = await rpcCall<EvmReceipt>(
    rpcUrl,
    "eth_getTransactionReceipt",
    [txHash],
  );

  if (receipt?.status === "0x0") {
    throw new OnchainVerificationError(
      "La transacción falló en la red blockchain.",
      "TX_FAILED",
    );
  }

  const confirmation = await getEvmConfirmations(
    rpcUrl,
    receipt?.blockNumber ?? tx.blockNumber,
  );
  const required = requiredConfirmations(moneda);

  return {
    verified: true,
    status:
      confirmation.confirmations >= required ? "CONFIRMED" : "OBSERVED",
    moneda,
    red: moneda === "BNB" ? "BNB Smart Chain (BEP20)" : "Ethereum (ERC20)",
    txHash,
    recipient: wallet,
    amount: formatUnits(value, 18),
    confirmations: confirmation.confirmations,
    requiredConfirmations: required,
    explorerUrl: cryptoExplorerUrl(moneda, txHash),
    blockNumber: confirmation.blockNumber,
  };
}

async function verifyUsdtBsc(
  txHash: string,
  wallet: string,
): Promise<OnchainVerification> {
  const rpcUrl = process.env.BSC_RPC_URL?.trim() || DEFAULT_BSC_RPC;
  const tokenContract =
    process.env.USDT_BSC_CONTRACT?.trim().toLowerCase() ||
    DEFAULT_USDT_BSC_CONTRACT;
  const receipt = await rpcCall<EvmReceipt>(
    rpcUrl,
    "eth_getTransactionReceipt",
    [txHash],
  );

  if (!receipt) {
    throw new OnchainVerificationError(
      "La transferencia USDT todavía no tiene recibo en BNB Smart Chain.",
      "TX_NOT_FOUND",
      true,
    );
  }

  if (receipt.status === "0x0") {
    throw new OnchainVerificationError(
      "La transacción USDT falló en BNB Smart Chain.",
      "TX_FAILED",
    );
  }

  const recipientSuffix = wallet.toLowerCase().replace(/^0x/, "");
  const transfers = (receipt.logs ?? []).filter((log) => {
    const topics = log.topics ?? [];
    return (
      log.address?.toLowerCase() === tokenContract &&
      topics[0]?.toLowerCase() === ERC20_TRANSFER_TOPIC &&
      topics[2]?.toLowerCase().endsWith(recipientSuffix)
    );
  });

  if (transfers.length === 0) {
    const tokenSeen = (receipt.logs ?? []).some(
      (log) => log.address?.toLowerCase() === tokenContract,
    );
    throw new OnchainVerificationError(
      tokenSeen
        ? "La transferencia USDT no fue enviada a la dirección de PISÁO."
        : "La transacción no contiene una transferencia del USDT BEP20 esperado.",
      tokenSeen ? "WRONG_RECIPIENT" : "WRONG_TOKEN",
    );
  }

  const amountRaw = transfers.reduce(
    (sum, log) => sum + BigInt(log.data || "0x0"),
    0n,
  );
  if (amountRaw <= 0n) {
    throw new OnchainVerificationError(
      "La transferencia USDT no contiene un monto válido.",
      "NO_VALUE",
    );
  }

  const confirmation = await getEvmConfirmations(
    rpcUrl,
    receipt.blockNumber,
  );
  const required = requiredConfirmations("USDT");

  return {
    verified: true,
    status:
      confirmation.confirmations >= required ? "CONFIRMED" : "OBSERVED",
    moneda: "USDT",
    red: "BNB Smart Chain (BEP20)",
    txHash,
    recipient: wallet,
    amount: formatUnits(amountRaw, 18),
    confirmations: confirmation.confirmations,
    requiredConfirmations: required,
    explorerUrl: cryptoExplorerUrl("USDT", txHash),
    blockNumber: confirmation.blockNumber,
  };
}

type BitcoinTx = {
  vout?: Array<{
    value?: number;
    scriptpubkey_address?: string;
  }>;
  status?: {
    confirmed?: boolean;
    block_height?: number;
  };
};

async function verifyBitcoin(
  txHash: string,
  wallet: string,
): Promise<OnchainVerification> {
  const api = cleanBaseUrl(process.env.BTC_EXPLORER_API_URL?.trim() || DEFAULT_BTC_API);
  let response: Response;

  try {
    response = await fetch(`${api}/tx/${txHash}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new OnchainVerificationError(
      "La red Bitcoin no respondió a tiempo. Intenta nuevamente.",
      "PROVIDER_UNAVAILABLE",
      true,
    );
  }

  if (response.status === 404) {
    throw new OnchainVerificationError(
      "El TxID todavía no aparece en la red Bitcoin.",
      "TX_NOT_FOUND",
      true,
    );
  }
  if (!response.ok) {
    throw new OnchainVerificationError(
      "No fue posible consultar la red Bitcoin en este momento.",
      "PROVIDER_UNAVAILABLE",
      true,
    );
  }

  const tx = (await response.json()) as BitcoinTx;
  const sats = (tx.vout ?? [])
    .filter((output) => output.scriptpubkey_address === wallet)
    .reduce((sum, output) => sum + (output.value ?? 0), 0);

  if (sats <= 0) {
    throw new OnchainVerificationError(
      "La transacción Bitcoin no contiene una salida hacia la dirección de PISÁO.",
      "WRONG_RECIPIENT",
    );
  }

  let confirmations = 0;
  const blockNumber = tx.status?.block_height ?? null;

  if (tx.status?.confirmed && blockNumber !== null) {
    try {
      const tipResponse = await fetch(`${api}/blocks/tip/height`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      });
      if (tipResponse.ok) {
        const tip = Number.parseInt(await tipResponse.text(), 10);
        if (Number.isFinite(tip) && tip >= blockNumber) {
          confirmations = tip - blockNumber + 1;
        }
      }
    } catch {
      confirmations = 1;
    }
  }

  const required = requiredConfirmations("BTC");

  return {
    verified: true,
    status: confirmations >= required ? "CONFIRMED" : "OBSERVED",
    moneda: "BTC",
    red: "Bitcoin",
    txHash,
    recipient: wallet,
    amount: formatUnits(BigInt(sats), 8),
    confirmations,
    requiredConfirmations: required,
    explorerUrl: cryptoExplorerUrl("BTC", txHash),
    blockNumber,
  };
}

export async function verifyCryptoTransaction(input: {
  moneda: OnchainCrypto;
  txHash: string;
  wallet: string;
}): Promise<OnchainVerification> {
  const txHash = normalizeCryptoTransactionHash(input.moneda, input.txHash);

  if (input.moneda === "USDT") {
    return verifyUsdtBsc(txHash, input.wallet);
  }
  if (input.moneda === "BTC") {
    return verifyBitcoin(txHash, input.wallet);
  }
  return verifyNativeEvm(input.moneda, txHash, input.wallet);
}
