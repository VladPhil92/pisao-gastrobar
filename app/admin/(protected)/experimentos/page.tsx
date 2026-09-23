import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RevenueExperimentCenter } from "@/components/admin/RevenueExperimentCenter";
import { getRevenueExperimentCenter } from "@/lib/revenue/revenue-experiment-engine";

export const dynamic = "force-dynamic";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export default async function AdminRevenueExperimentsPage() {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const data = await getRevenueExperimentCenter();
  const experiments = data.experiments.map((experiment) => ({
    ...experiment,
    result: experiment.result ? asRecord(experiment.result) : null,
    createdAt: experiment.createdAt.toISOString(),
    startedAt: experiment.startedAt?.toISOString() ?? null,
    endedAt: experiment.endedAt?.toISOString() ?? null,
    measuredAt: experiment.measuredAt?.toISOString() ?? null,
    action: {
      ...experiment.action,
      payload: experiment.action.payload
        ? asRecord(experiment.action.payload)
        : null,
    },
    assignments: experiment.assignments.map((assignment) => ({
      arm: assignment.arm,
      eligibleAt: assignment.eligibleAt?.toISOString() ?? null,
      exposedAt: assignment.exposedAt?.toISOString() ?? null,
    })),
  }));

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-pisao-gold text-xs font-semibold tracking-[0.22em] uppercase">
            Revenue Experimentation V3
          </p>
          <h1 className="font-display mt-2 text-4xl text-pisao-cream">
            Laboratorio de Incrementalidad
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
            Prueba Next Best Actions aprobadas con CONTROL/TREATMENT estable por
            sesión first-party. El objetivo es separar correlación de efecto
            incremental antes de convertir una recomendación en política.
          </p>
        </div>
        <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft px-4 py-3 text-xs leading-relaxed text-pisao-cream-muted">
          <span className="font-semibold text-pisao-cream">Diseño:</span>{" "}
          50/50 · mínimo 30 sesiones por grupo · una prueba Concierge activa.
        </div>
      </div>

      <RevenueExperimentCenter
        experiments={experiments}
        summary={data.summary}
      />
    </div>
  );
}
