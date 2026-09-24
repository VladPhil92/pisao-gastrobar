import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processPaymentAdminNotification } from "@/lib/notifications/payment-ops";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;
  if (!session?.user || !["SUPER_ADMIN", "ADMIN", "CAJERO"].includes(role ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const current = await prisma.paymentAdminNotification.findUnique({
    where: { id },
    select: { status: true },
  });

  if (!current) {
    return NextResponse.json({ error: "Alerta no encontrada." }, { status: 404 });
  }

  if (current.status === "DELIVERED") {
    return NextResponse.json(
      { error: "La alerta ya fue entregada." },
      { status: 409 },
    );
  }

  await prisma.paymentAdminNotification.update({
    where: { id },
    data: {
      status: "FAILED",
      attempts: current.status === "DEAD_LETTER" ? 0 : undefined,
      nextAttemptAt: new Date(),
      lastError: null,
    },
  });

  const result = await processPaymentAdminNotification(id);
  return NextResponse.json({ ok: result.status === "DELIVERED", result });
}
