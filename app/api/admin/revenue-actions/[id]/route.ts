import { auth } from "@/lib/auth";
import {
  approveRevenueAction,
  executeRevenueAction,
  rejectRevenueAction,
} from "@/lib/revenue/revenue-action-engine";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";

type Operation = "approve" | "reject" | "execute";

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
  if (!session?.user || !["SUPER_ADMIN", "ADMIN"].includes(user?.rol ?? "") || !user.id) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { operation?: Operation };
  const operation = body.operation;

  if (!["approve", "reject", "execute"].includes(operation ?? "")) {
    return Response.json({ error: "Operación inválida." }, { status: 400 });
  }

  try {
    const action =
      operation === "approve"
        ? await approveRevenueAction(id, user.id)
        : operation === "reject"
          ? await rejectRevenueAction(id, user.id)
          : await executeRevenueAction(id, user.id);

    const eventType =
      operation === "approve"
        ? "pisao.revenue.action_approved"
        : operation === "reject"
          ? "pisao.revenue.action_rejected"
          : "pisao.revenue.action_executed";

    void emitKevGovernanceEvent(eventType, {
      source: "revenue_action_engine_v2",
      action_type: action.type,
      risk_level: action.riskLevel,
      execution_mode: action.executionMode,
      priority_score: action.priorityScore,
    });

    return Response.json({
      ok: true,
      action: {
        id: action.id,
        status: action.status,
        type: action.type,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ACTION_FAILED";
    const status =
      code === "ACTION_NOT_PENDING" || code === "ACTION_NOT_APPROVED"
        ? 409
        : code === "INVALID_ACTION_PAYLOAD"
          ? 422
          : 500;

    return Response.json({ error: code }, { status });
  }
}
