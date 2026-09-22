"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, X, CircleCheckBig } from "lucide-react";

type ReservationState = "PENDIENTE" | "CONFIRMADA" | "CANCELADA" | "COMPLETADA";

export function ReservationActions({
  id,
  estado,
}: {
  id: string;
  estado: ReservationState;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<ReservationState | null>(null);
  const [error, setError] = useState("");

  async function update(nextState: ReservationState) {
    if (loading) return;
    setLoading(nextState);
    setError("");

    try {
      const response = await fetch(`/api/admin/reservas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nextState }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible actualizar.");

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar.");
    } finally {
      setLoading(null);
    }
  }

  if (estado === "CANCELADA" || estado === "COMPLETADA") {
    return (
      <span className="text-pisao-cream-muted text-xs">
        {estado === "COMPLETADA" ? "Cerrada" : "Sin acciones"}
      </span>
    );
  }

  return (
    <div className="min-w-[170px]">
      <div className="flex flex-wrap gap-2">
        {estado === "PENDIENTE" && (
          <button
            type="button"
            onClick={() => void update("CONFIRMADA")}
            disabled={Boolean(loading)}
            className="bg-pisao-green/20 text-pisao-cream hover:bg-pisao-green/30 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {loading === "CONFIRMADA" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            Confirmar
          </button>
        )}

        {estado === "CONFIRMADA" && (
          <button
            type="button"
            onClick={() => void update("COMPLETADA")}
            disabled={Boolean(loading)}
            className="bg-pisao-gold/15 text-pisao-gold hover:bg-pisao-gold/25 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {loading === "COMPLETADA" ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <CircleCheckBig className="size-3.5" />
            )}
            Completar
          </button>
        )}

        <button
          type="button"
          onClick={() => void update("CANCELADA")}
          disabled={Boolean(loading)}
          className="bg-red-400/10 text-red-300 hover:bg-red-400/20 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
        >
          {loading === "CANCELADA" ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <X className="size-3.5" />
          )}
          Cancelar
        </button>
      </div>

      {error && <p className="mt-1.5 text-[10px] text-red-300">{error}</p>}
    </div>
  );
}
