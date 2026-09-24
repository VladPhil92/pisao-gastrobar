import { auth } from "@/lib/auth";
import { syncRevenueActions } from "@/lib/revenue/revenue-action-engine";
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

  const result = await syncRevenueActions();

  void emitKevGovernanceEvent("pisao.revenue.actions_generated", {
    source: "revenue_action_engine_v2",
    candidates: result.candidates,
  });

  return Response.json({
    generated: result.candidates,
    observed: {
      paidOrders: result.inputs.paidOrders,
      paymentApprovalRate: result.inputs.paymentApprovalRate,
      attributionCoveragePct: result.inputs.attributionCoveragePct,
      reservationConfirmationRate: result.inputs.reservationConfirmationRate,
    },
  });
}
