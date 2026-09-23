"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  orderStatusActionLabel,
  type OrderDeliveryType,
  type OrderOperationalStatus,
} from "@/lib/orders/status";

export function OrderStatusControls({
  pedidoId,
  estado,
  tipoEntrega,
}: {
  pedidoId: string;
  estado: OrderOperationalStatus;
  tipoEntrega: OrderDeliveryType;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const action = orderStatusActionLabel(estado, tipoEntrega);
  if (!action) return null;

  const advance = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/pedidos/${pedidoId}/estado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: action.next }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(
          payload.error || "No fue posible actualizar el estado del pedido.",
        );
      }

      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No fue posible actualizar el estado del pedido.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-w-36 space-y-2">
      <button
        type="button"
        disabled={loading}
        onClick={() => void advance()}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-pisao-gold/30 px-3 py-1.5 text-xs font-medium text-pisao-gold hover:bg-pisao-gold/10 disabled:opacity-50"
      >
        {loading && <Loader2 className="size-3 animate-spin" />}
        {action.label}
      </button>
      {error && (
        <p className="max-w-44 text-[10px] leading-relaxed text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
