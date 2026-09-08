"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ACTIONS: Record<string, Array<{ estado: string; label: string }>> = {
  PENDIENTE: [
    { estado: "CONFIRMADA", label: "Confirmar" },
    { estado: "CANCELADA", label: "Cancelar" },
  ],
  CONFIRMADA: [
    { estado: "COMPLETADA", label: "Asistió" },
    { estado: "CANCELADA", label: "Cancelar" },
  ],
};

export function ReservationStatusButtons({ reservaId, estado }: { reservaId: string; estado: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const actions = ACTIONS[estado] ?? [];

  if (actions.length === 0) return null;

  async function update(nextState: string) {
    setLoading(nextState);
    try {
      const response = await fetch(`/api/admin/reservas/${reservaId}/estado`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ estado: nextState }),
      });
      if (!response.ok) throw new Error("No se pudo actualizar la reserva");
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
