import { NextResponse } from "next/server";

/**
 * El checkout cripto actual es manual con prevalidación on-chain y aprobación
 * humana. No existe un gateway cripto autorizado para mutar pagos mediante
 * webhooks. Mantener esta ruta explícitamente cerrada evita que un payload
 * externo pueda confirmar pedidos sin autenticación.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Webhook cripto deshabilitado. El flujo activo usa verificación on-chain y aprobación administrativa.",
      code: "CRYPTO_WEBHOOK_DISABLED",
    },
    { status: 410 },
  );
}
