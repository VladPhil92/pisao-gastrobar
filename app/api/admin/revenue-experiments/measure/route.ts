import { auth } from "@/lib/auth";
import { measureRunningRevenueExperiments } from "@/lib/revenue/revenue-experiment-engine";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { rol?: string } | undefined;
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(user?.rol ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const result = await measureRunningRevenueExperiments();

  void emitKevGovernanceEvent("pisao.revenue.experiments_measured", {
    source: "revenue_experimentation_v3",
    measured: result.measured,
  });

  return Response.json(result);
}
