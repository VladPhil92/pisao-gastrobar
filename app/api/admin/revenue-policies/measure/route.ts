import { auth } from "@/lib/auth";
import { measureActiveRevenuePolicies } from "@/lib/revenue/revenue-policy-engine";
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

  const result = await measureActiveRevenuePolicies();

  void emitKevGovernanceEvent("pisao.revenue.policies_measured", {
    source: "adaptive_revenue_v4",
    measured: result.measured,
    auto_rollbacks: result.results.filter((item) => item.autoRolledBack).length,
  });

  return Response.json(result);
}
