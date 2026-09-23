export const REVENUE_ASSISTS = [
  "CONCIERGE",
  "PLAN",
  "VISUAL_TABLE",
  "WHATSAPP",
] as const;

export type RevenueAssist = (typeof REVENUE_ASSISTS)[number];

export type RevenueTouchEvent = {
  tipo: string;
  createdAt: Date;
};

const ASSIST_BY_EVENT: Record<string, readonly RevenueAssist[]> = {
  plan_open: ["PLAN"],
  plan_config_change: ["PLAN"],
  plan_proposal_add: ["PLAN"],
  visual_table_open: ["VISUAL_TABLE"],
  visual_table_suggestion_add: ["VISUAL_TABLE"],
  concierge_open: ["CONCIERGE"],
  concierge_proposal_view: ["CONCIERGE"],
  concierge_proposal_add: ["CONCIERGE"],
  concierge_reservation_ready: ["CONCIERGE"],
  concierge_action_executed: ["CONCIERGE"],
  concierge_handoff_whatsapp: ["CONCIERGE", "WHATSAPP"],
  whatsapp_intent: ["WHATSAPP"],
};

export const REVENUE_ASSIST_EVENT_NAMES = Object.freeze(
  Object.keys(ASSIST_BY_EVENT),
);

export function summarizeRevenueTouches(events: RevenueTouchEvent[]) {
  const ordered = [...events].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  const assists: RevenueAssist[] = [];
  let lastAssist: RevenueAssist | null = null;
  let touchCount = 0;
  let observedFrom: Date | null = null;
  let observedTo: Date | null = null;

  for (const event of ordered) {
    const eventAssists = ASSIST_BY_EVENT[event.tipo] ?? [];
    if (eventAssists.length === 0) continue;

    touchCount += 1;
    observedFrom ??= event.createdAt;
    observedTo = event.createdAt;

    for (const assist of eventAssists) {
      if (!assists.includes(assist)) assists.push(assist);
      lastAssist = assist;
    }
  }

  return {
    assists,
    lastAssist,
    touchCount,
    observedFrom,
    observedTo,
  };
}
