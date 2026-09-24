import "server-only";

import { prisma } from "@/lib/prisma";
import { kevGovernanceEnabled } from "@/lib/governance/kev-bridge";
import { kevInboundEnabled } from "@/lib/governance/kev-inbound-security";

export type KevControlPlaneState =
  | "UNCONFIGURED"
  | "READY_NO_EVIDENCE"
  | "RECEIVING"
  | "DEGRADED";

const CAPABILITIES = [
  {
    id: "outbound-governance",
    label: "Gobernanza saliente",
    description:
      "PISÁO emite a Kev eventos firmados de Concierge, reservas, pedidos, revenue, inventario y pagos.",
  },
  {
    id: "advisory-return",
    label: "Retorno consultivo",
    description:
      "Kev puede devolver propuestas tipadas a PISÁO; ingresan como acciones pendientes y nunca se ejecutan automáticamente.",
  },
  {
    id: "human-approval",
    label: "Aprobación humana",
    description:
      "Las propuestas de Kev pasan por el mismo flujo de aprobación o rechazo del Revenue Action Engine.",
  },
  {
    id: "auditable-evidence",
    label: "Evidencia auditable",
    description:
      "Las entregas aceptadas, rechazadas o no disponibles quedan registradas sin persistir secretos ni PII.",
  },
] as const;

function safeBridgeHost() {
  const raw = process.env.KEV_GOVERNANCE_BRIDGE_URL?.trim();
  if (!raw) return null;

  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

export async function getKevControlPlaneSnapshot() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const evidence = await prisma.integrationEvidence.findMany({
    where: {
      integration: "KEV",
      createdAt: { gte: since7d },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      event: true,
      status: true,
      detail: true,
      createdAt: true,
    },
  });

  const configured = kevGovernanceEnabled();
  const inboundEnabled = kevInboundEnabled();
  const lastAttempt = evidence[0] ?? null;
  const lastSuccess = evidence.find((item) => item.status === "SUCCESS") ?? null;
  const hasFailureAfterLastSuccess = Boolean(
    lastAttempt &&
      lastAttempt.status !== "SUCCESS" &&
      (!lastSuccess || lastAttempt.createdAt > lastSuccess.createdAt),
  );

  let state: KevControlPlaneState = "READY_NO_EVIDENCE";
  if (!configured) state = "UNCONFIGURED";
  else if (hasFailureAfterLastSuccess) state = "DEGRADED";
  else if (lastSuccess) state = "RECEIVING";

  const evidence24h = evidence.filter((item) => item.createdAt >= since24h);
  const delivered24h = evidence24h.filter(
    (item) => item.status === "SUCCESS",
  ).length;
  const failed24h = evidence24h.filter(
    (item) => item.status !== "SUCCESS",
  ).length;
  const advisoryIngress7d = evidence.filter(
    (item) => item.event === "advisory_ingress" && item.status === "SUCCESS",
  ).length;

  const observedEvents = [
    ...new Set(
      evidence
        .filter((item) => item.status === "SUCCESS")
        .map((item) => item.event),
    ),
  ].sort();

  return {
    engineVersion: "kev_control_plane_v1",
    state,
    configured,
    inboundEnabled,
    bridgeHost: safeBridgeHost(),
    mode: "GOVERNED_BIDIRECTIONAL" as const,
    delivered24h,
    failed24h,
    advisoryIngress7d,
    observedEvents,
    lastSuccessAt: lastSuccess?.createdAt.toISOString() ?? null,
    lastAttemptAt: lastAttempt?.createdAt.toISOString() ?? null,
    capabilities: CAPABILITIES.map((capability) => ({
      ...capability,
      enabled:
        capability.id === "advisory-return"
          ? inboundEnabled
          : capability.id === "outbound-governance"
            ? configured
            : true,
    })),
    recentEvidence: evidence.slice(0, 20).map((item) => ({
      id: item.id,
      event: item.event,
      status: item.status,
      detail: item.detail,
      createdAt: item.createdAt.toISOString(),
    })),
    generatedAt: new Date().toISOString(),
  };
}
