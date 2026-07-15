"use client";

import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import type { CrearCargoCriptoResult } from "@/lib/payments/crypto";

export function StepPagoCripto({
  cargo,
  total,
  descuento,
  onContinuar,
}: {
  cargo: CrearCargoCriptoResult;
  total: number;
  descuento: number;
  onContinuar: () => void;
}) {
  return (
    <div className="max-w-lg space-y-6">
      <div className="border-pisao-gold/20 bg-pisao-carbon-soft rounded-xl border p-6">
        {descuento > 0 && (
          <p className="bg-pisao-gold/15 text-pisao-gold mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium">
            Descuento cripto aplicado: -{formatCurrency(descuento)}
          </p>
        )}
        <p className="text-pisao-cream-muted text-sm">Total a pagar</p>
        <p className="font-display text-pisao-gold text-2xl">
          {formatCurrency(total)}
        </p>

        <dl className="text-pisao-cream-muted mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Moneda</dt>
            <dd className="text-pisao-cream">{cargo.criptoMoneda}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Monto aproximado</dt>
            <dd className="text-pisao-cream">{cargo.montoCripto}</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt>Dirección de pago</dt>
            <dd className="bg-pisao-noche text-pisao-cream rounded-lg px-3 py-2 font-mono text-xs break-all">
              {cargo.direccionPago}
            </dd>
          </div>
        </dl>
      </div>

      <p className="text-pisao-cream-muted text-xs">
        Tu pedido se confirmará automáticamente al detectar la transacción
        on-chain. El hash quedará asociado a tu pedido para trazabilidad.
      </p>

      <Button variant="primary" onClick={onContinuar}>
        Ya realicé el pago
      </Button>
    </div>
  );
}
