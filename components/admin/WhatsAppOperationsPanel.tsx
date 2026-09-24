"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type OperationsSummary = {
  metrics: {
    received24h: number;
    processed24h: number;
    failed24h: number;
    failed10m: number;
    activeHandoffs: number;
    successRatePct: number | null;
    p95LatencyMs: number | null;
  };
  lastEvent: {
    field: string;
    status: string;
    receivedAt: string;
    processedAt: string | null;
    failedAt: string | null;
    failureCode: string | null;
  } | null;
  autoPause: {
    at: string | null;
    reason: string | null;
  };
  failures: Array<{
    id: string;
    field: string;
    failureCode: string | null;
    attemptCount: number;
    receivedAt: string;
    failedAt: string | null;
  }>;
  conversations: Array<{
    id: string;
    alias: string;
    state: "HUMAN_HANDOFF" | "WAITING_AI" | "AI_ACTIVE";
    lastInboundAt: string | null;
    lastAiMessageAt: string | null;
    lastHumanMessageAt: string | null;
    humanHandoffUntil: string | null;
    updatedAt: string;
  }>;
};

function fmt(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CO");
}

function stateLabel(state: OperationsSummary["conversations"][number]["state"]) {
  if (state === "HUMAN_HANDOFF") return "HUMANO";
  if (state === "WAITING_AI") return "ESPERANDO IA";
  return "IA ACTIVA";
}

export function WhatsAppOperationsPanel({
  summary,
}: {
  summary: OperationsSummary;
}) {
  const router = useRouter();
  const [releasing, setReleasing] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function release(conversationId: string) {
    setReleasing(conversationId);
    setMessage("");
    try {
      const response = await fetch("/api/admin/whatsapp/handoffs/release", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "No fue posible liberar el handoff.");
      }
      setMessage("Handoff liberado. El Concierge podrá responder al próximo mensaje.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No fue posible liberar el handoff.",
      );
    } finally {
      setReleasing(null);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-pisao-gold text-xs font-semibold uppercase tracking-[.16em]">
            Operations V5
          </p>
          <h2 className="font-display text-pisao-cream mt-1 text-2xl">
            Centro operacional de WhatsApp
          </h2>
          <p className="text-pisao-cream-muted mt-2 max-w-3xl text-sm leading-relaxed">
            Telemetría sin transcripciones ni teléfonos de clientes. Permite
            detectar fallos, handoffs humanos y degradación del canal antes de
            que afecten la operación.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="border-pisao-gold/30 text-pisao-gold hover:bg-pisao-gold/10 rounded-xl border px-4 py-2 text-xs font-semibold"
        >
          Actualizar estado
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["Eventos 24h", String(summary.metrics.received24h)],
          ["Procesados", String(summary.metrics.processed24h)],
          ["Fallos 24h", String(summary.metrics.failed24h)],
          ["Fallos 10m", String(summary.metrics.failed10m)],
          ["Handoffs", String(summary.metrics.activeHandoffs)],
          [
            "Éxito",
            summary.metrics.successRatePct === null
              ? "—"
              : `${summary.metrics.successRatePct}%`,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-3"
          >
            <p className="text-pisao-cream-muted text-[10px] uppercase tracking-wider">
              {label}
            </p>
            <p className="text-pisao-cream mt-1 text-xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-4">
          <p className="text-pisao-cream-muted text-[10px] uppercase tracking-wider">
            Último evento
          </p>
          <p className="text-pisao-cream mt-2 text-sm font-semibold">
            {summary.lastEvent
              ? `${summary.lastEvent.field} · ${summary.lastEvent.status}`
              : "Sin eventos"}
          </p>
          <p className="text-pisao-cream-muted mt-1 text-xs">
            {summary.lastEvent ? fmt(summary.lastEvent.receivedAt) : "—"}
          </p>
        </div>

        <div className="rounded-xl border border-pisao-gold/10 bg-pisao-noche p-4">
          <p className="text-pisao-cream-muted text-[10px] uppercase tracking-wider">
            Latencia p95
          </p>
          <p className="text-pisao-cream mt-2 text-sm font-semibold">
            {summary.metrics.p95LatencyMs === null
              ? "Sin muestra"
              : `${summary.metrics.p95LatencyMs} ms`}
          </p>
          <p className="text-pisao-cream-muted mt-1 text-xs">
            Eventos procesados en las últimas 24 horas
          </p>
        </div>

        <div
          className={`rounded-xl border p-4 ${
            summary.autoPause.at
              ? "border-red-400/20 bg-red-500/10"
              : "border-pisao-gold/10 bg-pisao-noche"
          }`}
        >
          <p className="text-pisao-cream-muted text-[10px] uppercase tracking-wider">
            Auto-pausa
          </p>
          <p
            className={`mt-2 text-sm font-semibold ${
              summary.autoPause.at ? "text-red-200" : "text-emerald-300"
            }`}
          >
            {summary.autoPause.at ? "ACTIVADA ANTERIORMENTE" : "SIN INCIDENTES"}
          </p>
          <p className="text-pisao-cream-muted mt-1 text-xs">
            {summary.autoPause.at
              ? `${fmt(summary.autoPause.at)} · ${summary.autoPause.reason ?? "FAILURE_BURST"}`
              : "El canal no ha requerido parada automática."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4">
          <h3 className="text-pisao-cream text-sm font-semibold">
            Conversaciones recientes
          </h3>
          <p className="text-pisao-cream-muted mt-1 text-xs">
            Identificadores pseudónimos; no se muestran números ni mensajes.
          </p>
          <div className="mt-4 grid gap-2">
            {summary.conversations.length ? (
              summary.conversations.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-pisao-gold/10 px-3 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-pisao-cream text-xs font-semibold">
                        {item.alias}
                      </p>
                      <p className="text-pisao-cream-muted mt-1 text-[11px]">
                        Última actividad: {fmt(item.updatedAt)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                        item.state === "HUMAN_HANDOFF"
                          ? "bg-blue-500/15 text-blue-200"
                          : item.state === "WAITING_AI"
                            ? "bg-amber-500/15 text-amber-200"
                            : "bg-emerald-500/15 text-emerald-300"
                      }`}
                    >
                      {stateLabel(item.state)}
                    </span>
                  </div>
                  {item.state === "HUMAN_HANDOFF" ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-pisao-gold/10 pt-3">
                      <p className="text-pisao-cream-muted text-[11px]">
                        Silencio IA hasta {fmt(item.humanHandoffUntil)}
                      </p>
                      <button
                        type="button"
                        onClick={() => void release(item.id)}
                        disabled={releasing === item.id}
                        className="border-pisao-gold/30 text-pisao-gold rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                      >
                        {releasing === item.id
                          ? "Liberando…"
                          : "Liberar handoff"}
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-pisao-cream-muted text-xs">
                Aún no hay conversaciones registradas.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche p-4">
          <h3 className="text-pisao-cream text-sm font-semibold">
            Fallos recientes
          </h3>
          <p className="text-pisao-cream-muted mt-1 text-xs">
            Solo códigos técnicos saneados; no se persisten payloads ni contenido.
          </p>
          <div className="mt-4 grid gap-2">
            {summary.failures.length ? (
              summary.failures.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-red-400/15 bg-red-500/[.04] px-3 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-red-200 text-xs font-semibold">
                      {item.failureCode ?? "PROCESSING_FAILED"}
                    </p>
                    <span className="text-pisao-cream-muted text-[10px]">
                      intento {item.attemptCount}
                    </span>
                  </div>
                  <p className="text-pisao-cream-muted mt-1 text-[11px]">
                    {item.field} · {fmt(item.failedAt ?? item.receivedAt)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-emerald-300 text-xs">
                No hay fallos persistidos.
              </p>
            )}
          </div>
        </div>
      </div>

      {message ? (
        <p className="text-pisao-cream-muted mt-4 text-sm">{message}</p>
      ) : null}
    </section>
  );
}
