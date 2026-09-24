import "server-only";

import { prisma } from "@/lib/prisma";

export const META_REVIEW_INTEGRATION = "META_REVIEW";

export const META_REVIEW_EVENTS = {
  embeddedSignupCompleted: "embedded_signup_completed",
  wabaProbeVerified: "waba_probe_verified",
  inboundProcessed: "whatsapp_inbound_processed",
  aiOutboundSent: "whatsapp_ai_outbound_sent",
  reviewSnapshot: "review_snapshot",
} as const;

type MetaReviewEvidenceEvent =
  (typeof META_REVIEW_EVENTS)[keyof typeof META_REVIEW_EVENTS];

type EvidenceDetail = Record<
  string,
  string | number | boolean | null | undefined
>;

function sanitizedDetail(detail?: EvidenceDetail) {
  if (!detail) return undefined;
  const entries = Object.entries(detail)
    .filter(([, value]) => value !== undefined)
    .slice(0, 16)
    .map(([key, value]) => [
      key.slice(0, 48),
      typeof value === "string" ? value.slice(0, 160) : value,
    ]);
  return Object.fromEntries(entries);
}

export async function recordMetaReviewEvidence(params: {
  event: MetaReviewEvidenceEvent;
  status?: "SUCCESS" | "FAILED" | "REJECTED";
  detail?: EvidenceDetail;
  dedupeMinutes?: number;
}) {
  const status = params.status ?? "SUCCESS";
  const dedupeMinutes = Math.min(
    24 * 60,
    Math.max(0, Math.round(params.dedupeMinutes ?? 30)),
  );

  if (dedupeMinutes > 0) {
    const since = new Date(Date.now() - dedupeMinutes * 60 * 1000);
    const existing = await prisma.integrationEvidence.findFirst({
      where: {
        integration: META_REVIEW_INTEGRATION,
        event: params.event,
        status,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (existing) return existing;
  }

  return prisma.integrationEvidence.create({
    data: {
      integration: META_REVIEW_INTEGRATION,
      event: params.event,
      status,
      detail: sanitizedDetail(params.detail),
    },
    select: { id: true },
  });
}

export async function getMetaReviewEvidenceLedger() {
  const rows = await prisma.integrationEvidence.findMany({
    where: { integration: META_REVIEW_INTEGRATION },
    orderBy: { createdAt: "desc" },
    take: 24,
    select: {
      id: true,
      event: true,
      status: true,
      detail: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    event: row.event,
    status: row.status,
    detail:
      row.detail && typeof row.detail === "object" && !Array.isArray(row.detail)
        ? (row.detail as Record<string, unknown>)
        : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function latestMetaReviewEvidenceByEvent() {
  const events = Object.values(META_REVIEW_EVENTS);
  const rows = await Promise.all(
    events.map(async (event) => {
      const evidence = await prisma.integrationEvidence.findFirst({
        where: {
          integration: META_REVIEW_INTEGRATION,
          event,
          status: "SUCCESS",
        },
        orderBy: { createdAt: "desc" },
        select: {
          event: true,
          detail: true,
          createdAt: true,
        },
      });
      return evidence;
    }),
  );

  return Object.fromEntries(
    rows
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map((row) => [
        row.event,
        {
          createdAt: row.createdAt.toISOString(),
          detail:
            row.detail &&
            typeof row.detail === "object" &&
            !Array.isArray(row.detail)
              ? (row.detail as Record<string, unknown>)
              : null,
        },
      ]),
  );
}
