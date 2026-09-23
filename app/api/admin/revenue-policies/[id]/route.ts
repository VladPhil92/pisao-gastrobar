import { auth } from "@/lib/auth";
import {
  activateAdaptiveRevenuePolicy,
  measureAdaptiveRevenuePolicy,
  pauseAdaptiveRevenuePolicy,
  rollbackAdaptiveRevenuePolicy,
} from "@/lib/revenue/revenue-policy-engine";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";
import { emitKevGovernanceEvent } from "@/lib/governance/kev-bridge";

type Operation = "activate" | "pause" | "rollback" | "measure";

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
  const body = (await request.json()) as {
    operation?: Operation;
    reason?: string;
  };

  if (!["activate", "pause", "rollback", "measure"].includes(body.operation ?? "")) {
    return Response.json({ error: "Operación inválida." }, { status: 400 });
  }

  try {
    if (body.operation === "measure") {
      const measured = await measureAdaptiveRevenuePolicy(id);
      return Response.json({ ok: true, ...measured });
    }

    const policy =
      body.operation === "activate"
        ? await activateAdaptiveRevenuePolicy(id, user.id)
        : body.operation === "pause"
          ? await pauseAdaptiveRevenuePolicy(id)
          : await rollbackAdaptiveRevenuePolicy(
              id,
              user.id,
              body.reason || "manual_admin_rollback",
            );

    const eventType =
      body.operation === "activate"
        ? "pisao.revenue.policy_activated"
        : body.operation === "pause"
          ? "pisao.revenue.policy_paused"
          : "pisao.revenue.policy_rolled_back";

    void emitKevGovernanceEvent(eventType, {
      source: "adaptive_revenue_v4",
      policy_ref: policy.key,
      status: policy.status,
      traffic_pct: policy.trafficPct,
    });

    return Response.json({
      ok: true,
      policy: {
        id: policy.id,
        status: policy.status,
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "POLICY_FAILED";
    const status =
      code === "POLICY_NOT_ACTIVATABLE" ||
      code === "POLICY_ACTIVE_LIMIT" ||
      code === "POLICY_NOT_ACTIVE" ||
      code === "POLICY_INVALID_PRODUCTS" ||
      code === "POLICY_PRODUCT_UNAVAILABLE_OR_LOW" ||
      code === "POLICY_NOT_ROLLBACKABLE"
        ? 409
        : code === "POLICY_NOT_FOUND"
          ? 404
          : 500;

    return Response.json({ error: code }, { status });
  }
}
