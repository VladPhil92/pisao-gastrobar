import "server-only";

import { createHmac, randomUUID } from "node:crypto";

export type PisaoGovernanceEventType =
  | "pisao.reservation.confirmed"
  | "pisao.reservation.rejected"
  | "pisao.reservation.cancelled"
  | "pisao.reservation.completed"
  | "pisao.concierge.completed"
  | "pisao.concierge.fallback"
  | "pisao.concierge.provider_error"
  | "pisao.concierge.action_planned"
  | "pisao.concierge.tool_executed"
  | "pisao.concierge.command_rejected"
  | "pisao.concierge.command_executed"
  | "pisao.concierge.command_prepared"
  | "pisao.order.created"
  | "pisao.order.confirmed"
  | "pisao.order.cancelled"
  | "pisao.revenue.actions_generated"
  | "pisao.revenue.action_approved"
  | "pisao.revenue.action_rejected"
  | "pisao.revenue.action_executed"
  | "pisao.revenue.actions_measured"
  | "pisao.revenue.experiments_synced"
  | "pisao.revenue.experiment_started"
  | "pisao.revenue.experiment_paused"
  | "pisao.revenue.experiment_completed"
  | "pisao.revenue.experiments_measured"
  | "pisao.revenue.experiment_assigned";

type GovernanceScalar = string | number | boolean | null;
type GovernancePayload = Record<
  string,
  GovernanceScalar | GovernanceScalar[]
>;

const APP_ID = "pisao-gastrobar";

function config() {
  return {
    url: process.env.KEV_GOVERNANCE_BRIDGE_URL?.trim() ?? "",
    secret: process.env.KEV_GOVERNANCE_BRIDGE_SECRET?.trim() ?? "",
  };
}

export function kevGovernanceEnabled() {
  const current = config();
  return current.url.startsWith("https://") && current.secret.length >= 32;
}

export function governanceRef(value: string) {
  const { secret } = config();
  if (!secret) return "unconfigured";
  return createHmac("sha256", secret)
    .update(value)
    .digest("hex")
    .slice(0, 24);
}

export function buildKevGovernanceEnvelope(
  eventType: PisaoGovernanceEventType,
  payload: GovernancePayload,
) {
  return {
    app_id: APP_ID,
    event_type: eventType,
    occurred_at: Date.now() / 1000,
    payload: {
      ...payload,
      source_event_id: randomUUID(),
    },
  };
}

export async function emitKevGovernanceEvent(
  eventType: PisaoGovernanceEventType,
  payload: GovernancePayload,
) {
  const { url, secret } = config();

  if (!url.startsWith("https://") || secret.length < 32) {
    return { delivered: false, reason: "bridge_disabled" as const };
  }

  const envelope = buildKevGovernanceEnvelope(eventType, payload);
  const body = JSON.stringify(envelope);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", secret)
    .update(timestamp + "." + body)
    .digest("hex");

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Pisao-Timestamp": timestamp,
        "X-Pisao-Signature": "sha256=" + signature,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(1_500),
    });

    if (!response.ok) {
      console.warn("[PISAO GOVERNANCE] Kev rejected event", {
        eventType,
        status: response.status,
      });
      return {
        delivered: false,
        reason: "bridge_rejected" as const,
        status: response.status,
      };
    }

    return { delivered: true as const };
  } catch (error) {
    console.warn("[PISAO GOVERNANCE] Kev bridge unavailable", {
      eventType,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return { delivered: false, reason: "bridge_unavailable" as const };
  }
}
