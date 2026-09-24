"use client";

import { useState } from "react";

type Check = {
  id: string;
  label: string;
  ok: boolean;
};

type Readiness = {
  ok: boolean;
  code: string;
  checks: Check[];
  verifiedAt: string | null;
  integration: {
    displayPhoneNumber: string | null;
    verifiedName: string | null;
    phoneNumberId: string;
    wabaId: string;
  } | null;
};

export function WhatsAppRuntimeControl({
  initialEnabled,
  forceDisabled,
  initialProbeStatus,
  initialProbeCode,
  initialProbeAt,
}: {
  initialEnabled: boolean;
  forceDisabled: boolean;
  initialProbeStatus: string | null;
  initialProbeCode: string | null;
  initialProbeAt: string | null;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState<"probe" | "toggle" | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [probeStatus, setProbeStatus] = useState(initialProbeStatus);
  const [probeCode, setProbeCode] = useState(initialProbeCode);
  const [probeAt, setProbeAt] = useState(initialProbeAt);
  const [message, setMessage] = useState("");

  async function probe() {
    setBusy("probe");
    setMessage("");
    try {
      const response = await fetch("/api/admin/whatsapp/readiness", {
        method: "POST",
      });
      const payload = (await response.json()) as Readiness & { error?: string };
      setReadiness(payload);
      setProbeStatus(payload.ok ? "SUCCESS" : "FAILED");
      setProbeCode(payload.code);
      setProbeAt(payload.verifiedAt ?? new Date().toISOString());
      setMessage(
        payload.ok
          ? "Conexión validada contra Meta. El canal está listo para activación."
          : "La verificación encontró gates pendientes. Revisa el detalle antes de activar.",
      );
    } catch {
      setMessage("No fue posible ejecutar la verificación en este momento.");
    } finally {
      setBusy(null);
    }
  }

  async function toggle() {
    setBusy("toggle");
    setMessage("");
    try {
      const response = await fetch("/api/admin/whatsapp/runtime", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !enabled }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        enabled?: boolean;
        error?: string;
        readiness?: Readiness;
      };

      if (!response.ok || !payload.ok || typeof payload.enabled !== "boolean") {
        if (payload.readiness) {
          setReadiness(payload.readiness);
          setProbeStatus(
            payload.readiness.ok ? "SUCCESS" : "FAILED",
          );
          setProbeCode(payload.readiness.code);
          setProbeAt(
            payload.readiness.verifiedAt ?? new Date().toISOString(),
          );
        }
        throw new Error(payload.error || "No fue posible cambiar el estado.");
      }

      setEnabled(payload.enabled);
      setMessage(
        payload.enabled
          ? "Concierge de WhatsApp activado. Ya puede procesar eventos entrantes."
          : "Concierge de WhatsApp pausado. Meta seguirá recibiendo HTTP 200 sin procesamiento IA.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible cambiar el estado operativo.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-pisao-gold text-xs font-semibold uppercase tracking-wider">
            Activation Gate V4
          </p>
          <h2 className="font-display text-pisao-cream mt-1 text-2xl">
            Verificación y activación productiva
          </h2>
          <p className="text-pisao-cream-muted mt-2 max-w-2xl text-sm leading-relaxed">
            Verifica el token cifrado, el Phone Number ID y la conectividad real
            con Meta antes de permitir respuestas automáticas. La activación se
            administra desde PISÁO y puede pausarse sin redeploy.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            enabled
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {enabled ? "CONCIERGE ACTIVO" : "CONCIERGE PAUSADO"}
        </span>
      </div>

      {forceDisabled ? (
        <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-relaxed text-red-200">
          Existe un bloqueo de emergencia en servidor
          (WHATSAPP_WEBHOOK_FORCE_DISABLED). Debe retirarse antes de activar.
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-3">
          <p className="text-pisao-cream-muted text-[11px] uppercase tracking-wider">
            Último probe
          </p>
          <p
            className={`mt-1 text-sm font-semibold ${
              probeStatus === "SUCCESS"
                ? "text-emerald-300"
                : probeStatus === "FAILED"
                  ? "text-red-300"
                  : "text-pisao-cream"
            }`}
          >
            {probeStatus ?? "SIN EJECUTAR"}
          </p>
        </div>
        <div className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-3">
          <p className="text-pisao-cream-muted text-[11px] uppercase tracking-wider">
            Código
          </p>
          <p className="text-pisao-cream mt-1 break-all text-sm">
            {probeCode ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-3">
          <p className="text-pisao-cream-muted text-[11px] uppercase tracking-wider">
            Verificado
          </p>
          <p className="text-pisao-cream mt-1 text-sm">
            {probeAt ? new Date(probeAt).toLocaleString("es-CO") : "—"}
          </p>
        </div>
      </div>

      {readiness?.checks?.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {readiness.checks.map((check) => (
            <div
              key={check.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-pisao-gold/10 bg-pisao-noche px-3 py-2.5 text-xs"
            >
              <span className="text-pisao-cream-muted">{check.label}</span>
              <span className={check.ok ? "text-emerald-300" : "text-amber-200"}>
                {check.ok ? "OK" : "PENDIENTE"}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void probe()}
          disabled={busy !== null}
          className="border-pisao-gold/30 text-pisao-gold hover:bg-pisao-gold/10 rounded-xl border px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          {busy === "probe" ? "Verificando…" : "Verificar conexión"}
        </button>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy !== null || forceDisabled}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40 ${
            enabled
              ? "border border-red-400/30 text-red-200 hover:bg-red-500/10"
              : "bg-pisao-gold text-pisao-carbon"
          }`}
        >
          {busy === "toggle"
            ? "Aplicando…"
            : enabled
              ? "Pausar Concierge"
              : "Activar Concierge"}
        </button>
      </div>

      {message ? (
        <p className="text-pisao-cream-muted mt-4 text-sm leading-relaxed">
          {message}
        </p>
      ) : null}
    </section>
  );
}
