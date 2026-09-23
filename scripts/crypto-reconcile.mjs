const endpoint =
  process.env.CRYPTO_RECONCILIATION_URL?.trim() ||
  "https://pisaogastrobar.com/api/internal/crypto/reconcile";
const secret = process.env.CRYPTO_RECONCILIATION_SECRET?.trim();

if (!secret || secret.length < 32) {
  console.error("CRYPTO_RECONCILIATION_SECRET is missing or too short.");
  process.exit(1);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 55_000);

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      Accept: "application/json",
      "User-Agent": "pisao-crypto-orchestrator-v11",
    },
    signal: controller.signal,
  });

  const text = await response.text();
  if (!response.ok) {
    console.error(
      `Crypto reconciliation failed: ${response.status} ${text.slice(0, 2000)}`,
    );
    process.exit(1);
  }

  console.log(text);
} catch (error) {
  console.error(
    "Crypto reconciliation request failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
