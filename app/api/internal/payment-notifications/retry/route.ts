import { NextResponse } from "next/server";
import { processDuePaymentAdminNotifications } from "@/lib/notifications/payment-ops";

export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.PAYMENT_NOTIFICATION_RETRY_SECRET?.trim();
  if (!secret || secret.length < 32) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await processDuePaymentAdminNotifications(20);
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}
