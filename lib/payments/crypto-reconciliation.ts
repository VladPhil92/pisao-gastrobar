import "server-only";

import { prisma } from "@/lib/prisma";
import { getCryptoPaymentDestination } from "@/lib/payments/crypto";
import { cryptoAmountSufficiency } from "@/lib/payments/crypto-quote";
import {
  OnchainVerificationError,
  verifyCryptoTransaction,
  type OnchainCrypto,
} from "@/lib/payments/onchain";
import { notifyCryptoConfirmationAdmin } from "@/lib/notifications/payment-admin";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";

type JsonObject = Record<string, unknown>;

export type CryptoReconciliationSummary = {
  checked: number;
  confirmed: number;
  observed: number;
  underpaid: number;
  errors: number;
  notified: number;
  pendingNotification: number;
};

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function expectedAmountFromPayload(payload: JsonObject, moneda: string) {
  const quotes = asObject(payload.quotes);
  const quote = asObject(quotes[moneda]);
  return stringValue(quote.amount);
}

function notificationRetryAllowed(reconciliation: JsonObject, now: Date) {
  if (stringValue(reconciliation.confirmationNotifiedAt)) return false;
  const lastAttempt = stringValue(reconciliation.lastNotificationAttemptAt);
  if (!lastAttempt) return true;
  const last = new Date(lastAttempt).getTime();
  if (!Number.isFinite(last)) return true;
  const retryMs = Math.max(
    5,
    Number(process.env.CRYPTO_NOTIFICATION_RETRY_MINUTES ?? 30),
  ) * 60_000;
  return now.getTime() - last >= retryMs;
}

function stateFromVerification(input: {
  status: "OBSERVED" | "CONFIRMED";
  sufficient: boolean | null;
}) {
  if (input.sufficient === false) return "UNDERPAID";
  return input.status;
}

async function persistReconciliationError(input: {
  paymentId: string;
  payload: JsonObject;
  code: string;
  message: string;
  retryable: boolean;
  checkedAt: string;
}) {
  const previous = asObject(input.payload.reconciliation);
  await prisma.pago.update({
    where: { id: input.paymentId },
    data: {
      payloadProveedor: {
        ...input.payload,
        reconciliation: {
          ...previous,
          engine: "PISAO_CRYPTO_ORCHESTRATOR_V11",
          state: input.retryable ? "RETRY_PENDING" : "ERROR",
          checkedAt: input.checkedAt,
          lastError: {
            code: input.code,
            message: input.message,
            retryable: input.retryable,
          },
        },
      },
    },
  });
}

export async function reconcilePendingCryptoPayments(
  limit = Number(process.env.CRYPTO_RECONCILIATION_BATCH_SIZE ?? 25),
): Promise<CryptoReconciliationSummary> {
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit || 25)));
  const payments = await prisma.pago.findMany({
    where: {
      metodo: "CRIPTO",
      estado: { in: ["PENDIENTE", "EN_VERIFICACION"] },
      txHash: { not: null },
      criptoMoneda: { not: null },
      walletDireccion: { not: null },
      pedido: {
        estado: { in: ["PENDIENTE_PAGO", "PENDIENTE_VERIFICACION"] },
      },
    },
    orderBy: { updatedAt: "asc" },
    take: safeLimit,
    include: {
      pedido: {
        select: {
          id: true,
          numero: true,
          clienteNombre: true,
          total: true,
          estado: true,
        },
      },
    },
  });

  const summary: CryptoReconciliationSummary = {
    checked: 0,
    confirmed: 0,
    observed: 0,
    underpaid: 0,
    errors: 0,
    notified: 0,
    pendingNotification: 0,
  };

  for (const payment of payments) {
    summary.checked += 1;
    const checkedAtDate = new Date();
    const checkedAt = checkedAtDate.toISOString();
    const payload = asObject(payment.payloadProveedor);
    const previousReconciliation = asObject(payload.reconciliation);
    const previousState = stringValue(previousReconciliation.state);

    const destination = getCryptoPaymentDestination(payment.criptoMoneda);
    if (
      !destination ||
      destination.direccion.toLowerCase() !==
        payment.walletDireccion?.toLowerCase()
    ) {
      summary.errors += 1;
      await persistReconciliationError({
        paymentId: payment.id,
        payload,
        code: "DESTINATION_MISMATCH",
        message: "La wallet persistida no coincide con un destino cripto autorizado.",
        retryable: false,
        checkedAt,
      });
      continue;
    }

    try {
      const verification = await verifyCryptoTransaction({
        moneda: destination.moneda as OnchainCrypto,
        txHash: payment.txHash!,
        wallet: destination.direccion,
      });

      const expectedAmount = expectedAmountFromPayload(
        payload,
        destination.moneda,
      );
      const sufficiency = cryptoAmountSufficiency({
        expectedAmount,
        receivedAmount: verification.amount,
      });
      const state = stateFromVerification({
        status: verification.status,
        sufficient: sufficiency.sufficient,
      });

      if (state === "CONFIRMED") summary.confirmed += 1;
      else if (state === "UNDERPAID") summary.underpaid += 1;
      else summary.observed += 1;

      const reconciliation: JsonObject = {
        ...previousReconciliation,
        engine: "PISAO_CRYPTO_ORCHESTRATOR_V11",
        state,
        checkedAt,
        network: verification.red,
        recipient: verification.recipient,
        amount: verification.amount,
        confirmations: verification.confirmations,
        requiredConfirmations: verification.requiredConfirmations,
        explorerUrl: verification.explorerUrl,
        blockNumber: verification.blockNumber,
        settlement: {
          quoteAvailable: sufficiency.available,
          expectedAmount: sufficiency.expectedAmount,
          receivedAmount: sufficiency.receivedAmount,
          minimumAcceptedAmount: sufficiency.minimumAcceptedAmount,
          tolerancePercent: sufficiency.tolerancePercent,
          variancePercent: sufficiency.variancePercent,
          sufficient: sufficiency.sufficient,
        },
        lastError: null,
      };

      await prisma.pago.update({
        where: { id: payment.id },
        data: {
          confirmacionesOnchain: verification.confirmations,
          payloadProveedor: {
            ...payload,
            verifier: "PISAO_ONCHAIN_V2",
            checkedAt,
            network: verification.red,
            recipient: verification.recipient,
            amount: verification.amount,
            confirmations: verification.confirmations,
            requiredConfirmations: verification.requiredConfirmations,
            status: verification.status,
            explorerUrl: verification.explorerUrl,
            blockNumber: verification.blockNumber,
            settlement: {
              quoteAvailable: sufficiency.available,
              expectedAmount: sufficiency.expectedAmount,
              receivedAmount: sufficiency.receivedAmount,
              minimumAcceptedAmount: sufficiency.minimumAcceptedAmount,
              tolerancePercent: sufficiency.tolerancePercent,
              variancePercent: sufficiency.variancePercent,
              sufficient: sufficiency.sufficient,
            },
            reconciliation,
          },
        },
      });

      const readyForAdmin =
        state === "CONFIRMED" && sufficiency.sufficient !== false;

      if (
        readyForAdmin &&
        payment.comprobanteRecibidoEn &&
        payment.pedido.estado === "PENDIENTE_PAGO"
      ) {
        await prisma.pedido.update({
          where: { id: payment.pedido.id },
          data: { estado: "PENDIENTE_VERIFICACION" },
        });
      }

      if (readyForAdmin && previousState !== "CONFIRMED") {
        void emitKevGovernanceEvent("pisao.payment.crypto.confirmed_onchain", {
          order_ref: governanceRef(payment.pedido.id),
          source: "crypto_orchestrator_v11",
          asset: destination.moneda,
          network: verification.red,
          confirmations: verification.confirmations,
          required_confirmations: verification.requiredConfirmations,
          evidence_received: Boolean(payment.comprobanteRecibidoEn),
          human_approval_required: true,
        });
      }

      if (
        readyForAdmin &&
        notificationRetryAllowed(previousReconciliation, checkedAtDate)
      ) {
        const notification = await notifyCryptoConfirmationAdmin({
          numero: payment.pedido.numero,
          clienteNombre: payment.pedido.clienteNombre,
          totalCop: Number(payment.pedido.total),
          moneda: destination.moneda,
          red: verification.red,
          txHash: verification.txHash,
          amount: verification.amount,
          confirmations: verification.confirmations,
          requiredConfirmations: verification.requiredConfirmations,
          explorerUrl: verification.explorerUrl,
          evidenceReceived: Boolean(payment.comprobanteRecibidoEn),
        });

        const notificationAt = new Date().toISOString();
        const refreshedPayload = {
          ...payload,
          verifier: "PISAO_ONCHAIN_V2",
          checkedAt,
          network: verification.red,
          recipient: verification.recipient,
          amount: verification.amount,
          confirmations: verification.confirmations,
          requiredConfirmations: verification.requiredConfirmations,
          status: verification.status,
          explorerUrl: verification.explorerUrl,
          blockNumber: verification.blockNumber,
          settlement: {
            quoteAvailable: sufficiency.available,
            expectedAmount: sufficiency.expectedAmount,
            receivedAmount: sufficiency.receivedAmount,
            minimumAcceptedAmount: sufficiency.minimumAcceptedAmount,
            tolerancePercent: sufficiency.tolerancePercent,
            variancePercent: sufficiency.variancePercent,
            sufficient: sufficiency.sufficient,
          },
          reconciliation: {
            ...reconciliation,
            lastNotificationAttemptAt: notificationAt,
            notificationProvider: notification.provider,
            notificationState:
              notification.delivery === "automatic" ? "SENT" : "PENDING",
            ...(notification.delivery === "automatic"
              ? { confirmationNotifiedAt: notificationAt }
              : {}),
          },
        };

        await prisma.pago.update({
          where: { id: payment.id },
          data: { payloadProveedor: refreshedPayload },
        });

        if (notification.delivery === "automatic") summary.notified += 1;
        else summary.pendingNotification += 1;
      }
    } catch (error) {
      summary.errors += 1;
      if (error instanceof OnchainVerificationError) {
        await persistReconciliationError({
          paymentId: payment.id,
          payload,
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          checkedAt,
        });
        continue;
      }

      await persistReconciliationError({
        paymentId: payment.id,
        payload,
        code: "RECONCILIATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
        retryable: true,
        checkedAt,
      });
    }
  }

  return summary;
}
