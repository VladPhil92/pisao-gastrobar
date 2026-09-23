import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdaptiveRevenuePolicyCenter } from "@/components/admin/AdaptiveRevenuePolicyCenter";
import { getAdaptiveRevenuePolicyCenter } from "@/lib/revenue/revenue-policy-engine";

export const dynamic = "force-dynamic";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export default async function AdaptiveRevenuePage() {
  const session = await auth();
  const role = (session?.user as { rol?: string } | undefined)?.rol;

  if (!session?.user || role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const data = await getAdaptiveRevenuePolicyCenter();
  const policies = data.policies.map((policy) => ({
    ...policy,
    createdAt: policy.createdAt.toISOString(),
    activatedAt: policy.activatedAt?.toISOString() ?? null,
    pausedAt: policy.pausedAt?.toISOString() ?? null,
    rolledBackAt: policy.rolledBackAt?.toISOString() ?? null,
    lastMeasuredAt: policy.lastMeasuredAt?.toISOString() ?? null,
    lastGuardrailCheckAt: policy.lastGuardrailCheckAt?.toISOString() ?? null,
    outcome: policy.outcome ? asRecord(policy.outcome) : null,
    action: {
      ...policy.action,
      payload: policy.action.payload ? asRecord(policy.action.payload) : null,
    },
    experiment: {
      ...policy.experiment,
      endedAt: policy.experiment.endedAt?.toISOString() ?? null,
      result: policy.experiment.result
        ? asRecord(policy.experiment.result)
        : null,
    },
    assignments: policy.assignments.map((assignment) => ({
      arm: assignment.arm,
      servedAt: assignment.servedAt?.toISOString() ?? null,
    })),
  }));

  return (
    <div className="mx-auto max-w-7xl pb-12">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-pisao-gold text-xs font-semibold uppercase tracking-[0.22em]">
            Profit-Aware Revenue Optimization V5
          </p>
          <h1 className="font-display mt-2 text-4xl text-pisao-cream">
            Centro de Políticas Adaptativas
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
            Convierte únicamente experimentos V3 concluyentes en Next Best
            Actions de producción, mantiene holdout de seguridad, incorpora
            margen de contribución cuando existe costo real configurado y pausa
            automáticamente promociones cuando aparece riesgo de inventario.
          </p>
        </div>

        <div className="rounded-2xl border border-pisao-gold/15 bg-pisao-carbon-soft px-4 py-3 text-xs leading-relaxed text-pisao-cream-muted">
          <span className="font-semibold text-pisao-cream">Guardrails:</span>{" "}
          90/10 · hasta 3 políticas · rollback automático · guardrail de stock ·
          cero autoridad para cambiar precio, descuento, inventario o pagos.
        </div>
      </div>

      <AdaptiveRevenuePolicyCenter
        policies={policies}
        summary={data.summary}
      />
    </div>
  );
}
