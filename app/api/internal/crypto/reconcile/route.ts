import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { reconcilePendingCryptoPayments } from "@/lib/payments/crypto-reconciliation";
import { captureServerError } from "@/lib/observability/sentry-transport";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const expected = process.env.CRYPTO_RECONCILIATION_SECRET?.trim();
  if (!expected || expected.length < 32) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

export async function POST(request: Request) {
  if (!process.env.CRYPTO_RECONCILIATION_SECRET?.trim()) {
    return NextResponse.json(
      {
        error: "Crypto reconciliation is not configured.",
        code: "CRYPTO_RECONCILIATION_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  if (!authorized(request)) {
    return NextResponse.json(
      { error: "No autorizado.", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  try {
    const summary = await reconcilePendingCryptoPayments();
    return NextResponse.json({
      ok: true,
      engine: "PISAO_CRYPTO_ORCHESTRATOR_V11",
      humanApprovalRequired: true,
      summary,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    void captureServerError(error, {
      surface: "crypto_reconciliation",
      code: "CRYPTO_RECONCILIATION_FAILED",
    });

    return NextResponse.json(
      {
        error: "No fue posible reconciliar los pagos cripto.",
        code: "CRYPTO_RECONCILIATION_FAILED",
      },
      { status: 503 },
    );
  }
}
