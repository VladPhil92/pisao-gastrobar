"use client";

import { QrCode, Coins, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { DESCUENTO_CRIPTO_PORCENTAJE } from "@/lib/payments/crypto";
import type { MetodoPago } from "@/lib/payments/types";

const opciones: {
  metodo: MetodoPago;
  titulo: string;
  descripcion: string;
  icon: typeof QrCode;
}[] = [
  {
    metodo: "QR_TRANSFERENCIA",
    titulo: "QR / Transferencia",
    descripcion: "Paga por transferencia bancaria y sube tu comprobante.",
    icon: QrCode,
  },
  {
    metodo: "CRIPTO",
    titulo: "Criptomonedas",
    descripcion: `${DESCUENTO_CRIPTO_PORCENTAJE}% de descuento automático.`,
    icon: Coins,
  },
  {
    metodo: "TARJETA",
    titulo: "Tarjeta crédito/débito",
    descripcion: "Pago seguro con pasarela colombiana.",
    icon: CreditCard,
  },
];

export function StepMetodoPago({
  selected,
  onSelect,
}: {
  selected: MetodoPago | null;
  onSelect: (metodo: MetodoPago) => void;
}) {
  return (
    <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
      {opciones.map(({ metodo, titulo, descripcion, icon: Icon }) => (
        <button
          key={metodo}
          type="button"
          onClick={() => onSelect(metodo)}
          className={cn(
            "flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors",
            selected === metodo
              ? "border-pisao-gold bg-pisao-gold/10"
              : "border-pisao-cream-muted/20 hover:border-pisao-gold/40",
          )}
        >
          <Icon className="text-pisao-gold h-6 w-6" />
          <span className="font-display text-pisao-cream text-lg">
            {titulo}
          </span>
          <span className="text-pisao-cream-muted text-xs">{descripcion}</span>
        </button>
      ))}
    </div>
  );
}
