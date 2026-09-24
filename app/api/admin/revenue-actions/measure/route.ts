import { auth } from "@/lib/auth";
import { measureRevenueActions } from "@/lib/revenue/revenue-action-engine";
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

  const result = await measureRevenueActions();

  void emitKevGovernanceEvent("pisao.revenue.actions_measured", {
    source: "revenue_action_engine_v2",
    measured: result.measured,
  });

  return Response.json(result);
}
