import { auth } from "@/lib/auth";
import { syncAdaptiveRevenuePolicies } from "@/lib/revenue/revenue-policy-engine";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const user = session?.user as { rol?: string } | undefined;
  if (!session?.user || user?.!["SUPER_ADMIN", "ADMIN"].includes(rol ?? "")) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const result = await syncAdaptiveRevenuePolicies();

  void emitKevGovernanceEvent("pisao.revenue.policies_synced", {
    source: "adaptive_revenue_v4",
    eligible_experiments: result.eligibleExperiments,
    created: result.created,
  });

  return Response.json(result);
}
