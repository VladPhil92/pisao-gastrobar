import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCryptoPaymentDestination } from "@/lib/payments/crypto";
import { cryptoAmountSufficiency } from "@/lib/payments/crypto-quote";
import {
  OnchainVerificationError,
  verifyCryptoTransaction,
  type OnchainVerification,
} from "@/lib/payments/onchain";
import {
  emitKevGovernanceEvent,
  governanceRef,
} from "@/lib/governance/kev-bridge";

/**
 * Validación final de pagos manuales.
 * - QR/Bre-B: exige comprobante almacenado.
 * - Cripto: exige comprobante + TxID prevalidado y vuelve a consultar la red
 *   antes de permitir la aprobación administrativa.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const rol = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || !["ADMIN", "CAJERO"].includes(rol ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { aprobado } = (await request.json()) as { aprobado: boolean };

  const currentPayment = await prisma.pago.findUnique({
    where: { pedidoId: id },
  });

  if (!currentPayment) {
    return NextResponse.json(
      { error: "Pago no encontrado." },
      { status: 404 },
    );
  }

  if (
    aprobado &&
    ["QR_TRANSFERENCIA", "CRIPTO"].includes(currentPayment.metodo) &&
    !currentPayment.comprobanteRecibidoEn
  ) {
    return NextResponse.json(
      {
        error:
          "No se puede aprobar un pago manual sin comprobante almacenado.",
      },
      { status: 409 },
    );
  }

  let onchain: OnchainVerification | null = null;

  if (aprobado && currentPayment.metodo === "CRIPTO") {
    if (
      !currentPayment.criptoMoneda ||
      !currentPayment.txHash ||
      !currentPayment.walletDireccion
    ) {
      return NextResponse.json(
        {
          error:
            "El pago cripto no tiene TxID/TxHash y destino on-chain verificados.",
        },
        { status: 409 },
      );
    }

    const destination = getCryptoPaymentDestination(
      currentPayment.criptoMoneda,
    );

    if (
      !destination ||
      destination.direccion.toLowerCase() !==
        currentPayment.walletDireccion.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "La configuración on-chain del pago no coincide con una wallet autorizada.",
        },
        { status: 409 },
      );
    }

    try {
      onchain = await verifyCryptoTransaction({
        moneda: destination.moneda,
        txHash: currentPayment.txHash,
        wallet: destination.direccion,
      });
    } catch (error) {
      if (error instanceof OnchainVerificationError) {
        return NextResponse.json(
          {
            error: `La transacción no pudo revalidarse: ${error.message}`,
            code: error.code,
            retryable: error.retryable,
          },
          { status: error.code === "PROVIDER_UNAVAILABLE" ? 503 : 409 },
        );
      }
      throw error;
    }

    const existingPayload =
      currentPayment.payloadProveedor &&
      typeof currentPayment.payloadProveedor === "object" &&
      !Array.isArray(currentPayment.payloadProveedor)
        ? (currentPayment.payloadProveedor as Record<string, unknown>)
        : {};
    const quotes =
      existingPayload.quotes &&
      typeof existingPayload.quotes === "object" &&
      !Array.isArray(existingPayload.quotes)
        ? (existingPayload.quotes as Record<string, unknown>)
        : {};
    const selectedQuote =
      quotes[currentPayment.criptoMoneda] &&
      typeof quotes[currentPayment.criptoMoneda] === "object" &&
      !Array.isArray(quotes[currentPayment.criptoMoneda])
        ? (quotes[currentPayment.criptoMoneda] as Record<string, unknown>)
        : null;
    const expectedAmount =
      typeof selectedQuote?.amount === "string" ? selectedQuote.amount : null;
    const sufficiency = cryptoAmountSufficiency({
      expectedAmount,
      receivedAmount: onchain.amount,
    });
    const recheckPayload = {
      ...existingPayload,
      verifier: "PISAO_ONCHAIN_V2",
      stage: "admin_recheck",
      checkedAt: new Date().toISOString(),
      network: onchain.red,
      recipient: onchain.recipient,
      amount: onchain.amount,
      confirmations: onchain.confirmations,
      requiredConfirmations: onchain.requiredConfirmations,
      status: onchain.status,
      explorerUrl: onchain.explorerUrl,
      blockNumber: onchain.blockNumber,
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

    if (sufficiency.available && sufficiency.sufficient === false) {
      await prisma.pago.update({
        where: { pedidoId: id },
        data: {
          confirmacionesOnchain: onchain.confirmations,
          payloadProveedor: recheckPayload,
        },
      });
      return NextResponse.json(
        {
          error:
            "La transacción está confirmada, pero el monto recibido es inferior al mínimo aceptado para este pedido.",
          code: "CRYPTO_UNDERPAID",
          receivedAmount: sufficiency.receivedAmount,
          expectedAmount: sufficiency.expectedAmount,
          minimumAcceptedAmount: sufficiency.minimumAcceptedAmount,
          explorerUrl: onchain.explorerUrl,
        },
        { status: 409 },
      );
    }

    if (onchain.status !== "CONFIRMED") {
      await prisma.pago.update({
        where: { pedidoId: id },
        data: {
          confirmacionesOnchain: onchain.confirmations,
          payloadProveedor: recheckPayload,
        },
      });

      return NextResponse.json(
        {
          error:
            "La transacción existe, pero aún no alcanza el mínimo de confirmaciones para aprobación final.",
          code: "CRYPTO_CONFIRMATIONS_PENDING",
          confirmations: onchain.confirmations,
          requiredConfirmations: onchain.requiredConfirmations,
          explorerUrl: onchain.explorerUrl,
        },
        { status: 409 },
      );
    }
  }

  const [pago, pedido] = await prisma.$transaction([
    prisma.pago.update({
      where: { pedidoId: id },
      data: {
        estado: aprobado ? "APROBADO" : "RECHAZADO",
        verificadoPorId: (session.user as { id?: string }).id,
        verificadoEn: new Date(),
        ...(onchain
          ? {
              confirmacionesOnchain: onchain.confirmations,
              payloadProveedor: {
                ...(currentPayment.payloadProveedor &&
                typeof currentPayment.payloadProveedor === "object" &&
                !Array.isArray(currentPayment.payloadProveedor)
                  ? (currentPayment.payloadProveedor as Record<string, unknown>)
                  : {}),
                verifier: "PISAO_ONCHAIN_V2",
                stage: "admin_approved",
                checkedAt: new Date().toISOString(),
                network: onchain.red,
                recipient: onchain.recipient,
                amount: onchain.amount,
                confirmations: onchain.confirmations,
                requiredConfirmations: onchain.requiredConfirmations,
                status: onchain.status,
                explorerUrl: onchain.explorerUrl,
                blockNumber: onchain.blockNumber,
              },
            }
          : {}),
      },
    }),
    prisma.pedido.update({
      where: { id },
      data: { estado: aprobado ? "CONFIRMADO" : "CANCELADO" },
      select: {
        id: true,
        estado: true,
        total: true,
        tipoEntrega: true,
        attribution: {
          select: {
            assists: true,
            lastAssist: true,
            touchCount: true,
          },
        },
        items: { select: { cantidad: true } },
      },
    }),
  ]);

  void emitKevGovernanceEvent(
    aprobado ? "pisao.order.confirmed" : "pisao.order.cancelled",
    {
      order_ref: governanceRef(pedido.id),
      source:
        aprobado && currentPayment.metodo === "CRIPTO"
          ? "admin_payment_verification_onchain"
          : "admin_payment_verification",
      total: Number(pedido.total),
      item_count: pedido.items.reduce((sum, item) => sum + item.cantidad, 0),
      tipo_entrega: pedido.tipoEntrega,
      estado: pedido.estado,
      payment_method: currentPayment.metodo,
      crypto_confirmations: onchain?.confirmations ?? null,
      attribution_tracked: Boolean(pedido.attribution),
      assist_surfaces: pedido.attribution?.assists ?? [],
      last_assist: pedido.attribution?.lastAssist ?? null,
      assist_touch_count: pedido.attribution?.touchCount ?? 0,
    },
  );

  return NextResponse.json({
    pago,
    onchain: onchain
      ? {
          status: onchain.status,
          confirmations: onchain.confirmations,
          requiredConfirmations: onchain.requiredConfirmations,
          explorerUrl: onchain.explorerUrl,
        }
      : null,
  });
}
