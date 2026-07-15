import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MetodoPago } from "@/lib/payments/types";

const mensajes: Record<MetodoPago, string> = {
  QR_TRANSFERENCIA:
    "Recibimos tu comprobante. Tu pedido está pendiente de verificación y te avisaremos por WhatsApp en cuanto lo confirmemos.",
  CRIPTO:
    "Estamos esperando la confirmación on-chain de tu transacción. Verás el estado actualizado automáticamente.",
  TARJETA:
    "Confirmaremos tu pedido automáticamente en cuanto el proveedor de pago notifique la aprobación.",
};

export function StepConfirmacion({
  numeroPedido,
  metodoPago,
}: {
  numeroPedido: number;
  metodoPago: MetodoPago;
}) {
  return (
    <div className="max-w-lg space-y-4 text-center sm:text-left">
      <CheckCircle2 className="text-pisao-gold mx-auto h-12 w-12 sm:mx-0" />
      <h2 className="font-display text-pisao-cream text-2xl">
        ¡Pedido #{numeroPedido} recibido!
      </h2>
      <p className="text-pisao-cream-muted text-sm">{mensajes[metodoPago]}</p>
      <div className="flex justify-center gap-3 sm:justify-start">
        <Button href="/menu" variant="outline">
          Seguir explorando el menú
        </Button>
        <Button href="/" variant="ghost">
          Volver al inicio
        </Button>
      </div>
      <p className="text-pisao-cream-muted text-xs">
        ¿Dudas sobre tu pedido?{" "}
        <Link href="/contacto" className="text-pisao-gold underline">
          Contáctanos
        </Link>
        .
      </p>
    </div>
  );
}
