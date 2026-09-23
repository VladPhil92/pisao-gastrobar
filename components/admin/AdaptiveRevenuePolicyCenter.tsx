"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Gauge,
  LoaderCircle,
  Pause,
  Play,
  Radar,
  RefreshCcw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

type JsonRecord = Record<string, unknown>;

type PolicyView = {
  id: string;
  key: string;
  status: string;
  trafficPct: number;
  priorityScore: number;
  minServeAssignments: number;
  minHoldoutAssignments: number;
  rollbackMarginPctPoints: number;
  rollbackReason: string | null;
  lastMeasuredAt: string | null;
  outcome: JsonRecord | null;
  action: {
    title: string;
    payload: JsonRecord | null;
  };
  experiment: {
    result: JsonRecord | null;
  };
  assignments: Array<{
    arm: string;
    servedAt: string | null;
  }>;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  ROLLED_BACK: "Rollback",
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function AdaptiveRevenuePolicyCenter({
  policies,
  summary,
}: {
  policies: PolicyView[];
  summary: {
    drafts: number;
    active: number;
    paused: number;
    rolledBack: number;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function post(url: string, body?: object, key = url) {
    setBusy(key);
    setMessage(null);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as {
        error?: string;
        created?: number;
        measured?: number;
      };

      if (!response.ok) {
        const labels: Record<string, string> = {
          POLICY_ACTIVE_LIMIT:
            "Ya hay tres políticas adaptativas activas. Pausa una antes de activar otra.",
          POLICY_NOT_ACTIVATABLE:
            "Esta política no puede activarse desde su estado actual.",
          POLICY_NOT_ACTIVE: "La política ya no está activa.",
          POLICY_NOT_ROLLBACKABLE:
            "La política no admite rollback desde su estado actual.",
        };
        throw new Error(
          labels[payload.error ?? ""] ??
            payload.error ??
            "No fue posible completar la operación.",
        );
      }

      if (typeof payload.created === "number") {
        setMessage(
          payload.created
            ? "Se prepararon " + payload.created + " política(s) adaptativa(s)."
            : "No hay nuevos experimentos exitosos elegibles.",
        );
      } else if (typeof payload.measured === "number") {
        setMessage(
          "Guardrails recalculados para " + payload.measured + " política(s).",
        );
      } else {
        setMessage("Política actualizada.");
      }

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Borradores", value: summary.drafts, icon: Radar },
          { label: "Activas", value: summary.active, icon: Gauge },
          { label: "Pausadas", value: summary.paused, icon: Pause },
          { label: "Rollback", value: summary.rolledBack, icon: ShieldAlert },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4"
          >
            <Icon className="size-4 text-pisao-gold" />
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[.14em] text-pisao-cream-muted">
              {label}
            </p>
            <p className="font-display mt-1 text-2xl text-pisao-cream">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void post("/api/admin/revenue-policies/sync", undefined, "sync")
          }
          className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-4 py-2.5 text-sm font-semibold text-pisao-carbon disabled:opacity-50"
        >
          {busy === "sync" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Radar className="size-4" />
          )}
          Preparar políticas
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void post(
              "/api/admin/revenue-policies/measure",
              undefined,
              "measure-all",
            )
          }
          className="inline-flex items-center gap-2 rounded-xl border border-pisao-gold/20 px-4 py-2.5 text-sm font-semibold text-pisao-gold disabled:opacity-50"
        >
          {busy === "measure-all" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RefreshCcw className="size-4" />
          )}
          Recalcular guardrails
        </button>

        {message && (
          <p className="max-w-2xl text-xs leading-relaxed text-pisao-cream-muted">
            {message}
          </p>
        )}
      </div>

      <div className="mt-7 space-y-4">
        {policies.length === 0 && (
          <div className="rounded-3xl border border-dashed border-pisao-gold/15 bg-pisao-noche/50 p-8 text-center">
            <Radar className="mx-auto size-7 text-pisao-gold" />
            <h2 className="font-display mt-3 text-2xl text-pisao-cream">
              Aún no hay políticas adaptativas.
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-pisao-cream-muted">
              Solo se pueden preparar desde experimentos V3 completados, con
              muestra suficiente y señal favorable al tratamiento.
            </p>
          </div>
        )}

        {policies.map((policy) => {
          const serveCount = policy.assignments.filter(
            (item) => item.arm === "SERVE",
          ).length;
          const holdoutCount = policy.assignments.filter(
            (item) => item.arm === "HOLDOUT",
          ).length;
          const exposures = policy.assignments.filter(
            (item) => item.arm === "SERVE" && item.servedAt,
          ).length;
          const serve = record(policy.outcome?.serve);
          const holdout = record(policy.outcome?.holdout);
          const guardrail =
            typeof policy.outcome?.guardrail === "string"
              ? policy.outcome.guardrail
              : "SIN_MEDIR";
          const productA =
            typeof policy.action.payload?.productAName === "string"
              ? policy.action.payload.productAName
              : null;
          const productB =
            typeof policy.action.payload?.productBName === "string"
              ? policy.action.payload.productBName
              : null;
          const experimentLift = numeric(
            policy.experiment.result?.observedConversionLiftPctPoints,
          );
          const productionLift = numeric(
            policy.outcome?.observedConversionLiftPctPoints,
          );

          return (
            <article
              key={policy.id}
              className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-pisao-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.1em] text-pisao-gold">
                      Adaptive Revenue V4
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-pisao-cream-muted">
                      {statusLabel[policy.status] ?? policy.status}
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-pisao-cream-muted">
                      {policy.trafficPct}% serve · {100 - policy.trafficPct}% holdout
                    </span>
                  </div>

                  <h2 className="font-display mt-3 text-2xl text-pisao-cream">
                    {productA && productB
                      ? productA + " + " + productB
                      : policy.action.title}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-relaxed text-pisao-cream-muted">
                    Lift experimental previo: {experimentLift >= 0 ? "+" : ""}
                    {experimentLift} pp. Prioridad operativa:{" "}
                    {policy.priorityScore}/100.
                  </p>
                </div>

                <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/60 px-4 py-3 text-center">
                  <p className="text-[9px] uppercase tracking-[.14em] text-pisao-cream-muted">
                    Guardrail
                  </p>
                  <p className="mt-1 text-xs font-semibold text-pisao-gold">
                    {guardrail}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/5 bg-pisao-noche/45 p-4">
                  <p className="text-[9px] uppercase text-pisao-cream-muted">
                    Serve
                  </p>
                  <p className="font-display mt-1 text-xl text-pisao-cream">
                    {serveCount}
                  </p>
                  <p className="mt-1 text-xs text-pisao-cream-muted">
                    Expuestas {exposures} · conversión{" "}
                    {numeric(serve.conversionRatePct)}%
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-pisao-noche/45 p-4">
                  <p className="text-[9px] uppercase text-pisao-cream-muted">
                    Holdout
                  </p>
                  <p className="font-display mt-1 text-xl text-pisao-cream">
                    {holdoutCount}
                  </p>
                  <p className="mt-1 text-xs text-pisao-cream-muted">
                    Conversión {numeric(holdout.conversionRatePct)}%
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-pisao-noche/45 p-4">
                  <p className="text-[9px] uppercase text-pisao-cream-muted">
                    Lift producción
                  </p>
                  <p className="font-display mt-1 text-xl text-pisao-cream">
                    {productionLift >= 0 ? "+" : ""}
                    {productionLift} pp
                  </p>
                  <p className="mt-1 text-xs text-pisao-cream-muted">
                    Medición continua, no sustituye el A/B original.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-pisao-noche/45 p-4">
                  <p className="text-[9px] uppercase text-pisao-cream-muted">
                    Muestra de seguridad
                  </p>
                  <p className="font-display mt-1 text-xl text-pisao-cream">
                    {policy.minServeAssignments}/{policy.minHoldoutAssignments}
                  </p>
                  <p className="mt-1 text-xs text-pisao-cream-muted">
                    Margen rollback: {policy.rollbackMarginPctPoints} pp.
                  </p>
                </div>
              </div>

              {policy.rollbackReason && (
                <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-xs leading-relaxed text-red-200">
                  Política retirada: {policy.rollbackReason}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {["DRAFT", "PAUSED"].includes(policy.status) && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void post(
                        "/api/admin/revenue-policies/" + policy.id,
                        { operation: "activate" },
                        policy.id + ":activate",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-3 py-2 text-xs font-semibold text-pisao-carbon disabled:opacity-50"
                  >
                    <Play className="size-3" />
                    {policy.status === "PAUSED" ? "Reanudar" : "Activar"}
                  </button>
                )}

                {policy.status === "ACTIVE" && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void post(
                        "/api/admin/revenue-policies/" + policy.id,
                        { operation: "pause" },
                        policy.id + ":pause",
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-pisao-gold/20 px-3 py-2 text-xs font-semibold text-pisao-gold disabled:opacity-50"
                  >
                    <Pause className="size-3" />
                    Pausar
                  </button>
                )}

                {["ACTIVE", "PAUSED"].includes(policy.status) && (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void post(
                          "/api/admin/revenue-policies/" + policy.id,
                          { operation: "measure" },
                          policy.id + ":measure",
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-pisao-cream disabled:opacity-50"
                    >
                      <RefreshCcw className="size-3" />
                      Medir ahora
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void post(
                          "/api/admin/revenue-policies/" + policy.id,
                          {
                            operation: "rollback",
                            reason: "manual_admin_rollback",
                          },
                          policy.id + ":rollback",
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50"
                    >
                      <RotateCcw className="size-3" />
                      Rollback
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
