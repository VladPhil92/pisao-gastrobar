import { auth } from "@/lib/auth";
import { syncRevenueExperiments } from "@/lib/revenue/revenue-experiment-engine";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { rol?: string } | undefined;
  if (!session?.user || user?.rol !== "ADMIN") {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const result = await syncRevenueExperiments();

  void emitKevGovernanceEvent("pisao.revenue.experiments_synced", {
    source: "revenue_experimentation_v3",
    eligible_actions: result.eligibleActions,
    created: result.created,
  });

  return Response.json(result);
}
