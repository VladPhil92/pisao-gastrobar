import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RevenueActionCenter } from "@/components/admin/RevenueActionCenter";
import { getRevenueActionCenter } from "@/lib/revenue/revenue-action-engine";

export const dynamic = "force-dynamic";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export default async function AdminRevenueActionsPage() {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const data = await getRevenueActionCenter();
  const actions = data.actions.map((action) => ({
    ...action,
    evidence: asRecord(action.evidence),
    payload: action.payload ? asRecord(action.payload) : null,
    outcome: action.outcome ? asRecord(action.outcome) : null,
    approvedAt: action.approvedAt?.toISOString() ?? null,
    rejectedAt: action.rejectedAt?.toISOString() ?? null,
    executedAt: action.executedAt?.toISOString() ?? null,
    measurementStartedAt: action.measurementStartedAt?.toISOString() ?? null,
    measuredAt: action.measuredAt?.toISOString() ?? null,
    createdAt: action.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-pisao-gold text-xs font-semibold tracking-[0.22em] uppercase">
            Revenue Action Engine V2
          </p>
          <h1 className="font-display mt-2 text-4xl text-pisao-cream">
            Centro de Acciones Comerciales
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
            Convierte ventas, reservas, atribución y composición de cesta en
            acciones gobernadas. El motor propone con reglas determinísticas;
            ninguna acción sensible modifica el negocio sin aprobación humana.
          </p>
        </div>
        <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft px-4 py-3 text-xs leading-relaxed text-pisao-cream-muted">
          <span className="font-semibold text-pisao-cream">Ciclo:</span>{" "}
          observar → proponer → aprobar → ejecutar → medir.
        </div>
      </div>

      <RevenueActionCenter actions={actions} summary={data.summary} />
    </div>
  );
}
