"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Beaker,
  CirclePause,
  CirclePlay,
  FlaskConical,
  Gauge,
  LoaderCircle,
  RefreshCcw,
  Square,
} from "lucide-react";

type JsonRecord = Record<string, unknown>;

type ExperimentView = {
  id: string;
  key: string;
  status: string;
  treatmentPct: number;
  minAssignmentsPerArm: number;
  result: JsonRecord | null;
  startedBy: { nombre: string } | null;
  endedBy: { nombre: string } | null;
  action: {
    title: string;
    payload: JsonRecord | null;
  };
  assignments: Array<{
    arm: string;
    eligibleAt: string | null;
    exposedAt: string | null;
  }>;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Borrador",
  RUNNING: "En ejecución",
  PAUSED: "Pausado",
  COMPLETED: "Completado",
};

const interpretationLabel: Record<string, string> = {
  INSUFFICIENT_SAMPLE: "Muestra insuficiente",
  INCONCLUSIVE: "Resultado inconcluso",
  TREATMENT_OBSERVED_HIGHER: "Treatment observado superior",
  CONTROL_OBSERVED_HIGHER: "Control observado superior",
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function RevenueExperimentCenter({
  experiments,
  summary,
}: {
  experiments: ExperimentView[];
  summary: {
    drafts: number;
    running: number;
    paused: number;
    completed: number;
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
        created?: number;
        measured?: number;
      };

      if (!response.ok) {
        const labels: Record<string, string> = {
          EXPERIMENT_ALREADY_RUNNING:
            "Ya existe un experimento Concierge en ejecución. Paúsalo o complétalo antes de iniciar otro.",
          EXPERIMENT_NOT_STARTABLE:
            "Este experimento no puede iniciarse desde su estado actual.",
          EXPERIMENT_NOT_RUNNING:
            "El experimento ya no está en ejecución.",
          EXPERIMENT_NOT_COMPLETABLE:
            "El experimento no puede cerrarse desde su estado actual.",
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
            ? `${payload.created} experimento(s) nuevo(s) preparado(s).`
            : "No hay nuevas acciones ejecutadas elegibles.",
        );
      } else if (typeof payload.measured === "number") {
        setMessage(`Resultados recalculados para ${payload.measured} experimento(s).`);
      } else {
        setMessage("Estado experimental actualizado.");
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
          { label: "Borradores", value: summary.drafts, icon: FlaskConical },
          { label: "En ejecución", value: summary.running, icon: Activity },
          { label: "Pausados", value: summary.paused, icon: CirclePause },
          { label: "Completados", value: summary.completed, icon: Gauge },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-pisao-gold/10 bg-pisao-carbon-soft p-4"
          >
            <Icon className="size-4 text-pisao-gold" />
            <p className="mt-4 text-[10px] font-semibold tracking-[.14em] text-pisao-cream-muted uppercase">
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
            void post("/api/admin/revenue-experiments/sync", undefined, "sync")
          }
          className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-4 py-2.5 text-sm font-semibold text-pisao-carbon disabled:opacity-50"
        >
          {busy === "sync" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Beaker className="size-4" />
          )}
          Preparar experimentos
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void post(
              "/api/admin/revenue-experiments/measure",
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
          Recalcular resultados
        </button>

        {message && (
          <p className="max-w-2xl text-xs leading-relaxed text-pisao-cream-muted">
            {message}
          </p>
        )}
      </div>

      <div className="mt-7 space-y-4">
        {experiments.length === 0 && (
          <div className="rounded-3xl border border-dashed border-pisao-gold/15 bg-pisao-noche/50 p-8 text-center">
            <Beaker className="mx-auto size-7 text-pisao-gold" />
            <h2 className="font-display mt-3 text-2xl text-pisao-cream">
              No hay experimentos preparados.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-pisao-cream-muted">
              Debe existir una acción de maridaje aprobada y ejecutada en
              Acciones IA. Después, este módulo crea una prueba controlada.
            </p>
          </div>
        )}

        {experiments.map((experiment) => {
          const controlCount = experiment.assignments.filter(
            (item) => item.arm === "CONTROL",
          ).length;
          const treatmentCount = experiment.assignments.filter(
            (item) => item.arm === "TREATMENT",
          ).length;
          const eligibleControl = experiment.assignments.filter(
            (item) => item.arm === "CONTROL" && item.eligibleAt,
          ).length;
          const eligibleTreatment = experiment.assignments.filter(
            (item) => item.arm === "TREATMENT" && item.eligibleAt,
          ).length;
          const exposedTreatment = experiment.assignments.filter(
            (item) => item.arm === "TREATMENT" && item.exposedAt,
          ).length;

          const control = record(experiment.result?.control);
          const treatment = record(experiment.result?.treatment);
          const interpretation =
            typeof experiment.result?.interpretation === "string"
              ? experiment.result.interpretation
              : null;
          const lift = numeric(
            experiment.result?.observedConversionLiftPctPoints,
          );
          const ci = Array.isArray(
            experiment.result?.conversionDifference95CiPctPoints,
          )
            ? experiment.result?.conversionDifference95CiPctPoints
            : null;
          const productA =
            typeof experiment.action.payload?.productAName === "string"
              ? experiment.action.payload.productAName
              : null;
          const productB =
            typeof experiment.action.payload?.productBName === "string"
              ? experiment.action.payload.productBName
              : null;

          return (
            <article
              key={experiment.id}
              className="rounded-3xl border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-pisao-gold/10 px-2.5 py-1 text-[10px] font-semibold tracking-[.1em] text-pisao-gold uppercase">
                      Concierge · CONTROL/TREATMENT
                    </span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-pisao-cream-muted">
                      {statusLabel[experiment.status] ?? experiment.status}
                    </span>
                  </div>
                  <h2 className="font-display mt-3 text-2xl text-pisao-cream">
                    {productA && productB
                      ? `${productA} + ${productB}`
                      : experiment.action.title}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-relaxed text-pisao-cream-muted">
                    Asignación estable por sesión first-party. La métrica primaria
                    es conversión pagada; el ticket es secundario.
                  </p>
                </div>
                <div className="rounded-2xl border border-pisao-gold/10 bg-pisao-noche/60 px-4 py-3 text-center">
                  <p className="text-[9px] uppercase tracking-[.14em] text-pisao-cream-muted">
                    Mínimo / grupo
                  </p>
                  <p className="font-display mt-1 text-2xl text-pisao-gold">
                    {experiment.minAssignmentsPerArm}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/5 bg-pisao-noche/45 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-pisao-cream-muted">
                    Control
                  </p>
                  <p className="font-display mt-2 text-2xl text-pisao-cream">
                    {controlCount} sesiones
                  </p>
                  <p className="mt-1 text-xs text-pisao-cream-muted">
                    Elegibles {eligibleControl} · Conversión{" "}
                    {numeric(control.conversionRatePct)}%
                  </p>
                </div>

                <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-gold/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-pisao-gold">
                    Treatment
                  </p>
                  <p className="font-display mt-2 text-2xl text-pisao-cream">
                    {treatmentCount} sesiones
                  </p>
                  <p className="mt-1 text-xs text-pisao-cream-muted">
                    Elegibles {eligibleTreatment} · NBA expuestas{" "}
                    {exposedTreatment} · Conversión{" "}
                    {numeric(treatment.conversionRatePct)}%
                  </p>
                </div>
              </div>

              {experiment.result && (
                <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-emerald-300">
                        Resultado controlado
                      </p>
                      <p className="mt-1 text-sm font-semibold text-pisao-cream">
                        {interpretation
                          ? interpretationLabel[interpretation] ?? interpretation
                          : "Sin interpretación"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase text-pisao-cream-muted">
                        Lift conversión
                      </p>
                      <p className="font-display mt-1 text-xl text-pisao-cream">
                        {lift >= 0 ? "+" : ""}
                        {lift} pp
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[9px] uppercase text-pisao-cream-muted">
                        Ticket control
                      </p>
                      <p className="mt-1 text-xs font-semibold text-pisao-cream">
                        $${numeric(control.averageOrderValue).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-pisao-cream-muted">
                        Ticket treatment
                      </p>
                      <p className="mt-1 text-xs font-semibold text-pisao-cream">
                        $${numeric(treatment.averageOrderValue).toLocaleString("es-CO")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-pisao-cream-muted">
                        IC 95% · diferencia
                      </p>
                      <p className="mt-1 text-xs font-semibold text-pisao-cream">
                        {ci && ci.length === 2
                          ? `${String(ci[0])} a ${String(ci[1])} pp`
                          : "No disponible"}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-[10px] leading-relaxed text-pisao-cream-muted">
                    El motor no declara un resultado direccional antes de alcanzar
                    la muestra mínima. La asignación controlada permite evaluar
                    incrementalidad con más rigor que una comparación observacional.
                  </p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {["DRAFT", "PAUSED"].includes(experiment.status) && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void post(
                        `/api/admin/revenue-experiments/${experiment.id}`,
                        { operation: "start" },
                        `${experiment.id}:start`,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-pisao-gold px-3 py-2 text-xs font-semibold text-pisao-carbon disabled:opacity-50"
                  >
                    {busy === `${experiment.id}:start` ? (
                      <LoaderCircle className="size-3 animate-spin" />
                    ) : (
                      <CirclePlay className="size-3" />
                    )}
                    {experiment.status === "PAUSED" ? "Reanudar" : "Iniciar"}
                  </button>
                )}

                {experiment.status === "RUNNING" && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void post(
                        `/api/admin/revenue-experiments/${experiment.id}`,
                        { operation: "pause" },
                        `${experiment.id}:pause`,
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-pisao-gold/20 px-3 py-2 text-xs font-semibold text-pisao-gold disabled:opacity-50"
                  >
                    <CirclePause className="size-3" />
                    Pausar
                  </button>
                )}

                {["RUNNING", "PAUSED"].includes(experiment.status) && (
                  <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        void post(
                          `/api/admin/revenue-experiments/${experiment.id}`,
                          { operation: "measure" },
                          `${experiment.id}:measure`,
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
                          `/api/admin/revenue-experiments/${experiment.id}`,
                          { operation: "complete" },
                          `${experiment.id}:complete`,
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-300 disabled:opacity-50"
                    >
                      <Square className="size-3" />
                      Cerrar experimento
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
