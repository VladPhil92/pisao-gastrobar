import "server-only";

import { prisma } from "@/lib/prisma";
import {
  REVENUE_ASSIST_EVENT_NAMES,
  summarizeRevenueTouches,
} from "@/lib/analytics/revenue-attribution-core";

const ATTRIBUTION_WINDOW_MS = 12 * 60 * 60 * 1000;

export async function resolveRevenueAttribution(sessionId: string) {
  const now = new Date();
  const since = new Date(now.getTime() - ATTRIBUTION_WINDOW_MS);

  const events = await prisma.eventoAnalitico.findMany({
    where: {
      sessionId,
      createdAt: { gte: since, lte: now },
      tipo: { in: [...REVENUE_ASSIST_EVENT_NAMES] },
    },
    select: {
      tipo: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const summary = summarizeRevenueTouches(events);

  return {
    sessionId,
    assists: summary.assists,
    lastAssist: summary.lastAssist,
    touchCount: summary.touchCount,
    observedFrom: summary.observedFrom,
    observedTo: summary.observedTo,
  };
}
