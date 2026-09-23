import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCryptoPaymentDestination } from "@/lib/payments/crypto";
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

    await prisma.pago.update({
      where: { pedidoId: body.pedidoId },
      data: {
        criptoMoneda: destination.moneda,
        walletDireccion: destination.direccion,
        txHash: verification.txHash,
        confirmacionesOnchain: verification.confirmations,
        payloadProveedor: {
          verifier: "PISAO_ONCHAIN_V1",
          checkedAt: new Date().toISOString(),
          network: verification.red,
          recipient: verification.recipient,
          amount: verification.amount,
          confirmations: verification.confirmations,
          requiredConfirmations: verification.requiredConfirmations,
          status: verification.status,
          explorerUrl: verification.explorerUrl,
          blockNumber: verification.blockNumber,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      transaction: {
        status: verification.status,
        moneda: verification.moneda,
        red: verification.red,
        txHash: verification.txHash,
        amount: verification.amount,
        confirmations: verification.confirmations,
        requiredConfirmations: verification.requiredConfirmations,
        explorerUrl: verification.explorerUrl,
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
