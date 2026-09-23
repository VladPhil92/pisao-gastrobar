import { auth } from "@/lib/auth";
import {
  completeRevenueExperiment,
  measureRevenueExperiment,
  pauseRevenueExperiment,
  startRevenueExperiment,
} from "@/lib/revenue/revenue-experiment-engine";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";

type Operation = "start" | "pause" | "complete" | "measure";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  if (!session?.user || user?.rol !== "ADMIN" || !user.id) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { operation?: Operation };
  const operation = body.operation;

  if (!["start", "pause", "complete", "measure"].includes(operation ?? "")) {
    return Response.json({ error: "Operación inválida." }, { status: 400 });
  }

  try {
    if (operation === "measure") {
      const result = await measureRevenueExperiment(id);
      return Response.json({ ok: true, result });
    }

    const experiment =
      operation === "start"
        ? await startRevenueExperiment(id, user.id)
        : operation === "pause"
          ? await pauseRevenueExperiment(id)
          : await completeRevenueExperiment(id, user.id);

    const eventType =
      operation === "start"
        ? "pisao.revenue.experiment_started"
        : operation === "pause"
          ? "pisao.revenue.experiment_paused"
          : "pisao.revenue.experiment_completed";

    void emitKevGovernanceEvent(eventType, {
      source: "revenue_experimentation_v3",
      experiment_ref: experiment.key,
      surface: experiment.surface,
      primary_metric: experiment.primaryMetric,
      treatment_pct: experiment.treatmentPct,
    });

    return Response.json({
      ok: true,
      experiment: {
        id: experiment.id,
        status: experiment.status,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "EXPERIMENT_FAILED";
    const status =
      code === "EXPERIMENT_ALREADY_RUNNING" ||
      code === "EXPERIMENT_NOT_STARTABLE" ||
      code === "EXPERIMENT_NOT_RUNNING" ||
      code === "EXPERIMENT_NOT_COMPLETABLE"
        ? 409
        : code === "EXPERIMENT_NOT_FOUND"
          ? 404
          : 500;

    return Response.json({ error: code }, { status });
  }
}
