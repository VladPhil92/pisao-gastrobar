"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function VerificarPagoButtons({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const verificar = async (aprobado: boolean) => {
    setLoading(true);
    try {
      await fetch(`/api/admin/pedidos/${pedidoId}/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aprobado }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        disabled={loading}
        onClick={() => verificar(true)}
        className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25"
      >
        Aprobar
      </button>
      <button
        disabled={loading}
        onClick={() => verificar(false)}
        className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/25"
      >
        Rechazar
      </button>
    </div>
  );
}
