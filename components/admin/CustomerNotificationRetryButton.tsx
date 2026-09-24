"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CustomerNotificationRetryButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function retry() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/notificaciones/cliente/${notificationId}/retry`,
        { method: "POST" },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? "No fue posible reintentar.");
        return;
      }
      router.refresh();
    } catch {
      setError("No fue posible reintentar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={loading}
        onClick={retry}
        className="text-pisao-gold text-[11px] font-semibold underline disabled:opacity-50"
      >
        {loading ? "Reintentando…" : "Reintentar aviso"}
      </button>
      {error && <p className="max-w-40 text-[10px] text-red-300">{error}</p>}
    </div>
  );
}
