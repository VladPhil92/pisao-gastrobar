import Link from "next/link";
import { Activity, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MetodoPago } from "@/lib/payments/types";

const mensajes: Record<MetodoPago, string> = {
  QR_TRANSFERENCIA:
    "Recibimos tu comprobante. El pago quedó pendiente de verificación administrativa y ya puedes seguir cada cambio desde PISÁO.",
  CRIPTO:
    "Recibimos tu comprobante cripto. PISÁO seguirá las confirmaciones on-chain y mostrará aquí cuándo el pago quede listo para revisión final.",
  TARJETA:
    "El pedido se actualizará cuando la pasarela productiva notifique la aprobación del pago.",
};

export function StepConfirmacion({
  numeroPedido,
  metodoPago,
  seguimientoUrl,
}: {
  numeroPedido: number;
  metodoPago: MetodoPago;
  seguimientoUrl: string;
}) {
  return (
    <div className="max-w-lg space-y-4 text-center sm:text-left">
      <CheckCircle2 className="text-pisao-gold mx-auto h-12 w-12 sm:mx-0" />
      <h2 className="font-display text-pisao-cream text-2xl">
        ¡Pedido #{numeroPedido} recibido!
      </h2>
      <p className="text-pisao-cream-muted text-sm">{mensajes[metodoPago]}</p>
      <div className="flex flex-col justify-center gap-3 sm:flex-row sm:justify-start">
        <Button href={seguimientoUrl} variant="primary">
          <Activity className="mr-2 size-4" />
          Ver estado en tiempo real
        </Button>
        <Button href="/menu" variant="outline">
          Seguir explorando el menú
        </Button>
      </div>
      <p className="text-pisao-cream-muted text-xs leading-relaxed">
        Guardamos un acceso privado en este dispositivo. Desde la pantalla de
        seguimiento también puedes copiar un enlace privado para abrir el pedido
        en otro equipo.
      </p>
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
