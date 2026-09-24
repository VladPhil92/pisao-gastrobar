import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendPaymentAdminTestEmail } from "@/lib/notifications/payment-admin";

export async function POST() {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(role ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const sent = await sendPaymentAdminTestEmail();
    if (!sent) {
      return NextResponse.json(
        {
          ok: false,
          error: "Resend no está completamente configurado o rechazó la entrega.",
          configured: {
            apiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
            from: Boolean(process.env.RESEND_FROM_EMAIL?.trim()),
            to: Boolean(process.env.PAYMENT_ADMIN_NOTIFY_EMAIL?.trim()),
          },
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, provider: "email" });
  } catch (error) {
    console.warn("[PISAO PAYMENTS] Synthetic admin notification failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { ok: false, error: "No fue posible enviar la prueba." },
      { status: 503 },
    );
  }
}
