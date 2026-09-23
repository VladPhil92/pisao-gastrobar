"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BadgeCheck,
  BrainCircuit,
  Check,
  Gauge,
  LoaderCircle,
  Play,
  RefreshCcw,
  ShieldCheck,
  X,
} from "lucide-react";

type JsonRecord = Record<string, unknown>;

type RevenueActionView = {
  id: string;
  type: string;
  status: string;
  riskLevel: string;
  executionMode: string;
  priorityScore: number;
  title: string;
  rationale: string;
  recommendedAction: string;
  objectiveMetric: string;
  evidence: JsonRecord;
  payload: JsonRecord | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  executedAt: string | null;
  measuredAt: string | null;
  outcome: JsonRecord | null;
  approvedBy: { nombre: string } | null;
};

const statusLabel: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  EXECUTED: "Ejecutada",
};

const typeLabel: Record<string, string> = {
  FEATURE_PRODUCT: "Merchandising",
  CONCIERGE_PAIRING: "Concierge · cross-sell",
  PAYMENT_FRICTION_REVIEW: "Pago",
  RESERVATION_FRICTION_REVIEW: "Reservas",
  ATTRIBUTION_COVERAGE_REVIEW: "Atribución",
  CONCIERGE_DISCOVERY: "Experimentación",
};

function numberValue(value: unknown) {
  return typeof value === "number" ? value : null;
}

function compactEvidence(evidence: JsonRecord) {
  const entries: Array<[string, string]> = [];

  const add = (key: string, label: string, suffix = "") => {
    const value = numberValue(evidence[key]);
    if (value !== null) entries.push([label, `${value.toLocaleString("es-CO")}${suffix}`]);
  };

  add("productUnits30d", "Unidades 30d");
  add("productRevenue30d", "Ingreso producto 30d", " COP");
  add("pairOrders30d", "Pedidos con combinación");
  add("paymentApprovalRate30d", "Aprobación pago", "%");
  add("reservationConfirmationRate30d", "Confirmación reservas", "%");
  add("attributionCoveragePct30d", "Cobertura atribución", "%");
  add("observedDifferencePct", "Diferencia ticket observada", "%");

  return entries.slice(0, 3);
}

function outcomeSummary(outcome: JsonRecord | null) {
  if (!outcome) return null;
  const entries: Array<[string, string]> = [];

  const push = (key: string, label: string, suffix = "") => {
    const value = numberValue(outcome[key]);
    if (value !== null) entries.push([label, `${value.toLocaleString("es-CO")}${suffix}`]);
  };

  push("observedDays", "Días observados");
  push("units", "Unidades");
  push("productRevenue", "Ingreso producto", " COP");
  push("paidPairOrders", "Pedidos con maridaje");
  push("conciergeAssistedPairOrders", "Con señal Concierge");

  return entries.slice(0, 4);
}

export function RevenueActionCenter({
  actions,
  summary,
}: {
  actions: RevenueActionView[];
  summary: {
    pending: number;
    approved: number;
    executed: number;
    rejected: number;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function post(url: string, body?: object, busyKey = url) {
    setBusy(busyKey);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as {
        error?: string;
        generated?: number;
        measured?: number;
      };
      if (!response.ok) throw new Error(payload.error || "No fue posible completar la acción.");

      if (typeof payload.generated === "number") {
        setMessage(
          payload.generated
            ? `Motor actualizado: ${payload.generated} acción(es) sustentadas por evidencia.`
            : "No apareció una nueva acción con evidencia suficiente.",
        );
      } else if (typeof payload.measured === "number") {
        setMessage(`Medición actualizada para ${payload.measured} acción(es) ejecutada(s).`);
      } else {
        setMessage("Acción actualizada correctamente.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Pendientes", summary.pending, Activity],
          ["Aprobadas", summary.approved, BadgeCheck],
          ["Ejecutadas", summary.executed, Play],
          ["Rechazadas", summary.rejected, X],
        ].map(([label, value, Icon]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4"
          >
            <Icon className="size-4 text-pisao-gold" />
            <p className="mt-4 text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
              {String(label)}
            </p>
            <p className="font-display mt-1 text-2xl text-pisao-cream">
              {String(value)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void post(
              "/api/admin/revenue-actions/generate",
              undefined,
              "generate",
            )
          }
          className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-4 py-2.5 text-sm font-semibold text-pisao-carbon disabled:opacity-50"
        >
          {busy === "generate" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <BrainCircuit className="size-4" />
          )}
          Analizar negocio ahora
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void post(
              "/api/admin/revenue-actions/measure",
              undefined,
              "measure",
            )
          }
          className="inline-flex items-center gap-2 rounded-xl border border-pisao-gold/20 px-4 py-2.5 text-sm font-semibold text-pisao-gold disabled:opacity-50"
        >
          {busy === "measure" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
          Actualizar medición
        </button>

        {message && (
          <p className="text-xs leading-relaxed text-pisao-cream-muted">
            {message}
          </p>
        )}
      </div>

      <div className="mt-7 space-y-4">
        {actions.length === 0 && (
          <div className="rounded-3xl border border-dashed border-pisao-gold/15 bg-pisao-noche/50 p-8 text-center">
            <Gauge className="mx-auto size-6 text-pisao-gold" />
            <h2 className="font-display mt-3 text-2xl text-pisao-cream">
              Aún no hay acciones generadas.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-pisao-cream-muted">
              Ejecuta el análisis. El motor solo persistirá propuestas cuando
              exista una muestra mínima y una regla determinística que las
              sustente.
            </p>
          </div>
        )}

        {actions.map((action) => {
          const evidence = compactEvidence(action.evidence);
          const outcome = outcomeSummary(action.outcome);
          const operationBusy = busy?.startsWith(action.id);

          return (
            <article
              key={action.id}
              className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-pisao-gold/10 px-2.5 py-1 text-[10px] font-semibold tracking-[.1em] text-pisao-gold uppercase">
                      {typeLabel[action.type] ?? action.type}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-pisao-cream-muted">
                      {statusLabel[action.status] ?? action.status}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-pisao-cream-muted">
                      Riesgo {action.riskLevel === "LOW" ? "bajo" : "medio"}
                    </span>
                  </div>
                  <h2 className="font-display mt-3 text-2xl text-pisao-cream">
                    {action.title}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-relaxed text-pisao-cream-muted">
                    {action.rationale}
                  </p>
                </div>

                <div className="shrink-0 rounded-2xl border border-pisao-gold/10 bg-pisao-noche/60 px-4 py-3 text-center">
                  <p className="text-[9px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
                    Prioridad
                  </p>
                  <p className="font-display mt-1 text-2xl text-pisao-gold">
                    {action.priorityScore}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-pisao-gold/10 bg-pisao-noche/55 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-pisao-gold" />
                  <div>
                    <p className="text-xs font-semibold text-pisao-cream">
                      Acción propuesta
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-pisao-cream-muted">
                      {action.recommendedAction}
                    </p>
                    <p className="mt-2 text-[10px] text-pisao-cream-muted">
                      Métrica objetivo: {action.objectiveMetric} ·{" "}
                      {action.executionMode === "SYSTEM_AFTER_APPROVAL"
                        ? "el sistema puede ejecutarla solo después de aprobación"
                        : "la ejecución es manual"}
                    </p>
                  </div>
                </div>
              </div>

              {evidence.length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {evidence.map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/5 px-3 py-3"
                    >
                      <p className="text-[9px] uppercase tracking-wide text-pisao-cream-muted">
                        {label}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-pisao-cream">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {outcome && outcome.length > 0 && (
                <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                  <p className="text-[10px] font-semibold tracking-[.12em] text-emerald-300 uppercase">
                    Observación posterior a ejecución
                  </p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4">
                    {outcome.map(([label, value]) => (
                      <div key={label}>
                        <p className="text-[9px] text-pisao-cream-muted uppercase">
                          {label}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-pisao-cream">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[10px] leading-relaxed text-pisao-cream-muted">
                    Resultado observado después de ejecutar la acción; no se
                    interpreta automáticamente como efecto causal.
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {action.status === "PENDING" && (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(operationBusy)}
                      onClick={() =>
                        void post(
                          `/api/admin/revenue-actions/${action.id}`,
                          { operation: "approve" },
                          `${action.id}:approve`,
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-3 py-2 text-xs font-semibold text-pisao-carbon disabled:opacity-50"
                    >
                      {busy === `${action.id}:approve` ? (
                        <LoaderCircle className="size-3 animate-spin" />
                      ) : (
                        <Check className="size-3" />
                      )}
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(operationBusy)}
                      onClick={() =>
                        void post(
                          `/api/admin/revenue-actions/${action.id}`,
                          { operation: "reject" },
                          `${action.id}:reject`,
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50"
                    >
                      <X className="size-3" />
                      Rechazar
                    </button>
                  </>
                )}

                {action.status === "APPROVED" && (
                  <button
                    type="button"
                    disabled={Boolean(operationBusy)}
                    onClick={() =>
                      void post(
                        `/api/admin/revenue-actions/${action.id}`,
                        { operation: "execute" },
                        `${action.id}:execute`,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-3 py-2 text-xs font-semibold text-pisao-carbon disabled:opacity-50"
                  >
                    {busy === `${action.id}:execute` ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : (
                      <Play className="size-3" />
                    )}
                    {action.executionMode === "SYSTEM_AFTER_APPROVAL"
                      ? "Ejecutar cambio"
                      : "Marcar acción realizada"}
                  </button>
                )}

                {action.status === "EXECUTED" && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 px-3 py-2 text-xs font-semibold text-emerald-300">
                    <BadgeCheck className="size-3" />
                    Ejecutada
                    {action.approvedBy?.nombre
                      ? ` · aprobó ${action.approvedBy.nombre}`
                      : ""}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
