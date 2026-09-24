import "server-only";

import { prisma } from "@/lib/prisma";

function alias(customerKey: string) {
  return `WA-${customerKey.slice(-8).toUpperCase()}`;
}

function stateForConversation(params: {
  handoffUntil: Date | null;
  lastInboundAt: Date | null;
  lastAiMessageAt: Date | null;
}) {
  const now = Date.now();
  if (params.handoffUntil && params.handoffUntil.getTime() > now) {
    return "HUMAN_HANDOFF" as const;
  }
  if (
    params.lastInboundAt &&
    (!params.lastAiMessageAt ||
      params.lastInboundAt.getTime() > params.lastAiMessageAt.getTime())
  ) {
    return "WAITING_AI" as const;
  }
  return "AI_ACTIVE" as const;
}

export async function getWhatsAppOperationsSummary() {
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since10m = new Date(now.getTime() - 10 * 60 * 1000);

  const [
    received24h,
    processed24h,
    failed24h,
    failed10m,
    lastEvent,
    recentFailures,
    recentConversations,
    activeHandoffs,
    config,
    processedSamples,
  ] = await Promise.all([
    prisma.whatsAppWebhookEvent.count({
      where: { receivedAt: { gte: since24h } },
    }),
    prisma.whatsAppWebhookEvent.count({
      where: { status: "PROCESSED", receivedAt: { gte: since24h } },
    }),
    prisma.whatsAppWebhookEvent.count({
      where: { status: "FAILED", receivedAt: { gte: since24h } },
    }),
    prisma.whatsAppWebhookEvent.count({
      where: { status: "FAILED", failedAt: { gte: since10m } },
    }),
    prisma.whatsAppWebhookEvent.findFirst({
      orderBy: { receivedAt: "desc" },
      select: {
        field: true,
        status: true,
        receivedAt: true,
        processedAt: true,
        failedAt: true,
        failureCode: true,
      },
    }),
    prisma.whatsAppWebhookEvent.findMany({
      where: { status: "FAILED" },
      orderBy: { failedAt: "desc" },
      take: 12,
      select: {
        id: true,
        field: true,
        failureCode: true,
        attemptCount: true,
        receivedAt: true,
        failedAt: true,
      },
    }),
    prisma.whatsAppConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        customerKey: true,
        lastInboundAt: true,
        lastAiMessageAt: true,
        lastHumanMessageAt: true,
        humanHandoffUntil: true,
        updatedAt: true,
      },
    }),
    prisma.whatsAppConversation.count({
      where: { humanHandoffUntil: { gt: now } },
    }),
    prisma.whatsAppMetaConfig.findUnique({
      where: { id: "primary" },
      select: {
        lastAutoPauseAt: true,
        lastAutoPauseReason: true,
      },
    }),
    prisma.whatsAppWebhookEvent.findMany({
      where: {
        status: "PROCESSED",
        processedAt: { not: null },
        receivedAt: { gte: since24h },
      },
      orderBy: { processedAt: "desc" },
      take: 50,
      select: { receivedAt: true, processedAt: true },
    }),
  ]);

  const latencies = processedSamples
    .map((item) =>
      item.processedAt
        ? Math.max(0, item.processedAt.getTime() - item.receivedAt.getTime())
        : null,
    )
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  const p95LatencyMs = latencies.length
    ? latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * 0.95) - 1)]
    : null;

  return {
    metrics: {
      received24h,
      processed24h,
      failed24h,
      failed10m,
      activeHandoffs,
      successRatePct:
        received24h > 0 ? Math.round((processed24h / received24h) * 1000) / 10 : null,
      p95LatencyMs,
    },
    lastEvent: lastEvent
      ? {
          ...lastEvent,
          receivedAt: lastEvent.receivedAt.toISOString(),
          processedAt: lastEvent.processedAt?.toISOString() ?? null,
          failedAt: lastEvent.failedAt?.toISOString() ?? null,
        }
      : null,
    autoPause: {
      at: config?.lastAutoPauseAt?.toISOString() ?? null,
      reason: config?.lastAutoPauseReason ?? null,
    },
    failures: recentFailures.map((item) => ({
      id: item.id,
      field: item.field,
      failureCode: item.failureCode,
      attemptCount: item.attemptCount,
      receivedAt: item.receivedAt.toISOString(),
      failedAt: item.failedAt?.toISOString() ?? null,
    })),
    conversations: recentConversations.map((item) => ({
      id: item.id,
      alias: alias(item.customerKey),
      state: stateForConversation({
        handoffUntil: item.humanHandoffUntil,
        lastInboundAt: item.lastInboundAt,
        lastAiMessageAt: item.lastAiMessageAt,
      }),
      lastInboundAt: item.lastInboundAt?.toISOString() ?? null,
      lastAiMessageAt: item.lastAiMessageAt?.toISOString() ?? null,
      lastHumanMessageAt: item.lastHumanMessageAt?.toISOString() ?? null,
      humanHandoffUntil: item.humanHandoffUntil?.toISOString() ?? null,
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}
