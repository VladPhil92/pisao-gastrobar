"use client";

import { useState } from "react";

export function PaymentNotificationTestButton() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function runTest() {
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/admin/notificaciones/pago/test", {
        method: "POST",
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        provider?: string;
      };
      if (!response.ok || !body.ok) {
        setState("error");
        setMessage(body.error ?? "La prueba no pudo completarse.");
        return;
      }
      setState("ok");
      setMessage("Email de prueba aceptado por el proveedor.");
    } catch {
      setState("error");
      setMessage("No fue posible ejecutar la prueba.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={runTest}
        disabled={state === "loading"}
        className="rounded-xl border border-pisao-gold/30 bg-pisao-gold/10 px-4 py-2 text-xs font-semibold text-pisao-gold transition hover:bg-pisao-gold/15 disabled:opacity-50"
      >
        {state === "loading" ? "Probando…" : "Probar alerta de pago por email"}
      </button>
      {message && (
        <p className={state === "ok" ? "text-xs text-emerald-300" : "text-xs text-red-300"}>
          {message}
        </p>
      )}
    </div>
  );
}
