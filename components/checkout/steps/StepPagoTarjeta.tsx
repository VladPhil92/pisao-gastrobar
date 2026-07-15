import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { CrearLinkPagoResult } from "@/lib/payments/types";

export function StepPagoTarjeta({
  resultado,
  total,
  onContinuar,
}: {
  resultado: CrearLinkPagoResult;
  total: number;
  onContinuar: () => void;
}) {
  return (
    <div className="max-w-lg space-y-6">
      <div className="border-pisao-gold/20 bg-pisao-carbon-soft rounded-xl border p-6">
        <p className="text-pisao-cream-muted text-sm">Total a pagar</p>
        <p className="font-display text-pisao-gold text-2xl">
          {formatCurrency(total)}
        </p>
        <p className="text-pisao-cream-muted mt-2 text-xs">
          Procesado por <strong>{resultado.proveedor}</strong>
        </p>
      </div>

      <Button
        href={resultado.linkPago}
        variant="primary"
        target="_blank"
        rel="noreferrer"
      >
        Ir a pagar de forma segura
      </Button>

      <p className="text-pisao-cream-muted text-xs">
        Serás redirigido a la pasarela de pago. Tu pedido se confirmará
        automáticamente al recibir la notificación del proveedor.
      </p>

      <Button variant="outline" onClick={onContinuar}>
        Ya completé el pago
      </Button>
    </div>
  );
}
