import { NextResponse } from "next/server";
import { processDuePaymentAdminNotifications } from "@/lib/notifications/payment-ops";
import { processDueCustomerOrderNotifications } from "@/lib/notifications/customer-order";

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

  const [admin, customer] = await Promise.all([
    processDuePaymentAdminNotifications(20),
    processDueCustomerOrderNotifications(20),
  ]);

  return NextResponse.json({
    ok: true,
    ...admin,
    customer,
    at: new Date().toISOString(),
  });
}
