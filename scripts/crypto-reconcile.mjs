const cryptoEndpoint =
  process.env.CRYPTO_RECONCILIATION_URL?.trim() ||
  "https://pisaogastrobar.com/api/internal/crypto/reconcile";
const cryptoSecret = process.env.CRYPTO_RECONCILIATION_SECRET?.trim();

const paymentNotificationEndpoint =
  process.env.PAYMENT_NOTIFICATION_RETRY_URL?.trim() ||
  "https://pisaogastrobar.com/api/internal/payment-notifications/retry";
const paymentNotificationSecret =
  process.env.PAYMENT_NOTIFICATION_RETRY_SECRET?.trim();

function requireSecret(name, value) {
  if (!value || value.length < 32) {
    console.error(`${name} is missing or too short.`);
    process.exit(1);
  }
}

async function postInternal(label, endpoint, secret) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        Accept: "application/json",
        "User-Agent": "pisao-operations-orchestrator-v12",
      },
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `${label} failed: ${response.status} ${text.slice(0, 2000)}`,
      );
    }

    console.log(`[${label}] ${text}`);
  } finally {
    clearTimeout(timeout);
  }
}

requireSecret("CRYPTO_RECONCILIATION_SECRET", cryptoSecret);
requireSecret("PAYMENT_NOTIFICATION_RETRY_SECRET", paymentNotificationSecret);

try {
  await postInternal(
    "crypto-reconciliation",
    cryptoEndpoint,
    cryptoSecret,
  );
  await postInternal(
    "payment-notification-retry",
    paymentNotificationEndpoint,
    paymentNotificationSecret,
  );
} catch (error) {
  console.error(
    "PISÁO operations orchestrator failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
