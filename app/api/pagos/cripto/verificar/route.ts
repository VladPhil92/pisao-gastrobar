import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCryptoPaymentDestination } from "@/lib/payments/crypto";
import { cryptoAmountSufficiency } from "@/lib/payments/crypto-quote";
import { settlementState } from "@/lib/payments/crypto-intent";
import {
  OnchainVerificationError,
  normalizeCryptoTransactionHash,
  verifyCryptoTransaction,
  type OnchainCrypto,
} from "@/lib/payments/onchain";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { captureServerError } from "@/lib/observability/sentry-transport";

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return NextResponse.json(
      { error: "Origen de solicitud no permitido.", code: edgeOrigin.code },
      { status: 403 },
    );
  }

  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `crypto-tx-check:${identity}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Demasiados intentos de verificación." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    const body = (await request.json()) as {
      pedidoId?: string;
      criptoMoneda?: string;
      txHash?: string;
    };

    if (!body.pedidoId || !body.criptoMoneda || !body.txHash) {
      return NextResponse.json(
        { error: "Faltan pedido, criptomoneda o TxID/TxHash." },
        { status: 400 },
      );
    }

    const destination = getCryptoPaymentDestination(body.criptoMoneda);
    if (!destination) {
      return NextResponse.json(
        { error: "Criptomoneda no soportada." },
        { status: 400 },
      );
    }

    const moneda = destination.moneda as OnchainCrypto;
    const normalizedHash = normalizeCryptoTransactionHash(
      moneda,
      body.txHash,
    );

    const pedido = await prisma.pedido.findUnique({
      where: { id: body.pedidoId },
      include: { pago: true },
    });

    if (!pedido?.pago) {
      return NextResponse.json(
        { error: "Pedido o pago no encontrado." },
        { status: 404 },
      );
    }

    if (pedido.pago.metodo !== "CRIPTO") {
      return NextResponse.json(
        { error: "Este pedido no usa pago con criptomonedas." },
        { status: 409 },
      );
    }

    if (
      pedido.pago.estado === "APROBADO" ||
      pedido.estado === "CONFIRMADO" ||
      pedido.estado === "ENTREGADO"
    ) {
      return NextResponse.json(
        { error: "Este pago ya fue validado." },
        { status: 409 },
      );
    }

    if (
      pedido.pago.criptoMoneda &&
      pedido.pago.criptoMoneda !== destination.moneda
    ) {
      return NextResponse.json(
        {
          error:
            "La criptomoneda no coincide con la seleccionada previamente para este pedido.",
        },
        { status: 409 },
      );
    }

    const replay = await prisma.pago.findFirst({
      where: {
        txHash: normalizedHash,
        NOT: { pedidoId: body.pedidoId },
      },
      select: { id: true },
    });

    if (replay) {
      return NextResponse.json(
        {
          error:
            "Esta transacción ya fue vinculada a otro pedido y no puede reutilizarse.",
          code: "TX_REPLAY",
        },
        { status: 409 },
      );
    }

    const verification = await verifyCryptoTransaction({
      moneda,
      txHash: normalizedHash,
      wallet: destination.direccion,
    });

    const existingPayload =
      pedido.pago.payloadProveedor &&
      typeof pedido.pago.payloadProveedor === "object" &&
      !Array.isArray(pedido.pago.payloadProveedor)
        ? (pedido.pago.payloadProveedor as Record<string, unknown>)
        : {};

    const quotes =
      existingPayload.quotes &&
      typeof existingPayload.quotes === "object" &&
      !Array.isArray(existingPayload.quotes)
        ? (existingPayload.quotes as Record<string, unknown>)
        : {};
    const selectedQuote =
      quotes[destination.moneda] &&
      typeof quotes[destination.moneda] === "object" &&
      !Array.isArray(quotes[destination.moneda])
        ? (quotes[destination.moneda] as Record<string, unknown>)
        : null;
    const expectedAmount =
      typeof selectedQuote?.amount === "string" ? selectedQuote.amount : null;
    const sufficiency = cryptoAmountSufficiency({
      expectedAmount,
      receivedAmount: verification.amount,
    });

    const checkedAt = new Date().toISOString();
    const paymentState = settlementState({
      confirmations: verification.confirmations,
      requiredConfirmations: verification.requiredConfirmations,
      sufficient: sufficiency.sufficient,
      variancePercent: sufficiency.variancePercent,
    });
    const settlementPayload = {
      ...existingPayload,
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
      paymentState,
      settlement: {
        quoteAvailable: sufficiency.available,
        expectedAmount: sufficiency.expectedAmount,
        receivedAmount: sufficiency.receivedAmount,
        minimumAcceptedAmount: sufficiency.minimumAcceptedAmount,
        tolerancePercent: sufficiency.tolerancePercent,
        variancePercent: sufficiency.variancePercent,
        sufficient: sufficiency.sufficient,
      },
    };

    await prisma.pago.update({
      where: { pedidoId: body.pedidoId },
      data: {
        criptoMoneda: destination.moneda,
        walletDireccion: destination.direccion,
        txHash: verification.txHash,
        confirmacionesOnchain: verification.confirmations,
        estado: paymentState === "PAID" ? "EN_VERIFICACION" : "PENDIENTE",
        payloadProveedor: settlementPayload,
      },
    });

    if (sufficiency.available && sufficiency.sufficient === false) {
      return NextResponse.json(
        {
          error:
            "La transacción llegó a la wallet correcta, pero el monto recibido es inferior al mínimo esperado para este pedido.",
          code: "CRYPTO_UNDERPAID",
          retryable: false,
          transaction: {
            status: verification.status,
            moneda: verification.moneda,
            red: verification.red,
            txHash: verification.txHash,
            amount: verification.amount,
            expectedAmount: sufficiency.expectedAmount,
            minimumAcceptedAmount: sufficiency.minimumAcceptedAmount,
            amountSufficient: false,
            confirmations: verification.confirmations,
            requiredConfirmations: verification.requiredConfirmations,
            explorerUrl: verification.explorerUrl,
          },
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      transaction: {
        status: verification.status,
        moneda: verification.moneda,
        red: verification.red,
        txHash: verification.txHash,
        amount: verification.amount,
        expectedAmount: sufficiency.expectedAmount,
        minimumAcceptedAmount: sufficiency.minimumAcceptedAmount,
        amountSufficient: sufficiency.sufficient,
        quoteAvailable: sufficiency.available,
        confirmations: verification.confirmations,
        requiredConfirmations: verification.requiredConfirmations,
        explorerUrl: verification.explorerUrl,
        paymentState,
      },
    });
  } catch (error) {
    if (error instanceof OnchainVerificationError) {
      const status =
        error.code === "PROVIDER_UNAVAILABLE"
          ? 503
          : error.code === "TX_NOT_FOUND"
            ? 404
            : 422;

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        },
        { status },
      );
    }

    void captureServerError(error, {
      surface: "crypto_onchain_verification",
      code: "CRYPTO_TX_VERIFY_FAILED",
    });

    return NextResponse.json(
      {
        error: "No fue posible verificar la transacción en este momento.",
        code: "CRYPTO_TX_VERIFY_FAILED",
      },
      { status: 503 },
    );
  }
}
