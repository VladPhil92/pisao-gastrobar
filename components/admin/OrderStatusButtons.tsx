"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ACTIONS: Record<string, Array<{ estado: string; label: string }>> = {
  CONFIRMADO: [
    { estado: "EN_PREPARACION", label: "Preparar" },
    { estado: "CANCELADO", label: "Cancelar" },
  ],
  EN_PREPARACION: [
    { estado: "LISTO", label: "Marcar listo" },
    { estado: "CANCELADO", label: "Cancelar" },
  ],
  LISTO: [
    { estado: "EN_CAMINO", label: "En camino" },
    { estado: "ENTREGADO", label: "Entregado" },
    { estado: "CANCELADO", label: "Cancelar" },
  ],
  EN_CAMINO: [
    { estado: "ENTREGADO", label: "Entregado" },
    { estado: "CANCELADO", label: "Cancelar" },
  ],
};

export function OrderStatusButtons({ pedidoId, estado }: { pedidoId: string; estado: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const actions = ACTIONS[estado] ?? [];

  if (actions.length === 0) return null;

  async function update(nextState: string) {
    setLoading(nextState);
    try {
      const response = await fetch(`/api/admin/pedidos/${pedidoId}/estado`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: nextState }),
      });
      if (!response.ok) throw new Error("No se pudo actualizar el pedido");
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action) => (
        <button
          key={action.estado}
          type="button"
          disabled={loading !== null}
          onClick={() => void update(action.estado)}
          className="border-pisao-gold/25 text-pisao-cream hover:border-pisao-gold/60 disabled:opacity-50 rounded-lg border px-2 py-1 text-xs transition-colors"
        >
          {loading === action.estado ? "Guardando…" : action.label}
        </button>
      ))}
    </div>
  );
}
