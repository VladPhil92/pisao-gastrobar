import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";

const DEFAULT_REWARDS_INGEST_URL =
  "https://ctgone.com/api/ecosystem/pisao/rewards/events";
const MAX_ATTEMPTS = 10;

type RewardOutboxRecord = {
  id: string;
  eventKey: string;
  type: "ORDER_PAID" | "ORDER_FULFILLED" | "ORDER_CANCELLED" | "RESERVATION_COMPLETED";
  ctgOneSubject: string;
  pedidoId: string | null;
  reservaId: string | null;
  amountCop: { toString(): string } | null;
  createdAt: Date;
  attempts: number;
};

export function rewardsIngestUrl(): string {
  return process.env.CTGONE_REWARDS_INGEST_URL?.trim()
    || DEFAULT_REWARDS_INGEST_URL;
}

function rewardsSecret(): string | null {
  const secret = process.env.CTGONE_REWARDS_INGEST_SECRET?.trim() ?? "";
  return secret.length >= 32 ? secret : null;
}

function signPayload(timestamp: string, body: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");
}

function serializeEvent(row: RewardOutboxRecord) {
  return {
    eventId: row.eventKey,
    provider: "pisao" as const,
    type: row.type,
    subject: row.ctgOneSubject,
    orderId: row.pedidoId,
    reservationId: row.reservaId,
    amountCop: row.amountCop?.toString() ?? null,
    occurredAt: row.createdAt.toISOString(),
  };
}

async function deliverOne(row: RewardOutboxRecord): Promise<boolean> {
  const secret = rewardsSecret();
  if (!secret) return false;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(serializeEvent(row));
  let response: Response;

  try {
    response = await fetch(rewardsIngestUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ctgone-pisao-rewards-timestamp": timestamp,
        "x-ctgone-pisao-rewards-signature": signPayload(timestamp, body, secret),
        "x-idempotency-key": row.eventKey,
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(6_000),
    });
  } catch (error) {
    await prisma.ctgOneRewardOutbox.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        attempts: { increment: 1 },
        lastError: error instanceof Error ? error.message.slice(0, 240) : "NETWORK_ERROR",
      },
    });
    return false;
  }

  if (response.ok || response.status === 409) {
    await prisma.ctgOneRewardOutbox.update({
      where: { id: row.id },
      data: {
        status: "DELIVERED",
        attempts: { increment: 1 },
        lastError: null,
        deliveredAt: new Date(),
      },
    });
    return true;
  }

  await prisma.ctgOneRewardOutbox.update({
    where: { id: row.id },
    data: {
      status: "FAILED",
      attempts: { increment: 1 },
      lastError: `CTGONE_HTTP_${response.status}`,
    },
  });
  return false;
}

/**
 * Best-effort drain. Durable rows remain in the database on failure, so callers
 * must never roll back restaurant operations because CTG One is unavailable.
 */
export async function drainCtgOneRewardOutbox(limit = 10): Promise<{
  attempted: number;
  delivered: number;
}> {
  if (!rewardsSecret()) return { attempted: 0, delivered: 0 };

  const rows = await prisma.ctgOneRewardOutbox.findMany({
    where: {
      status: { in: ["PENDING", "FAILED"] },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: Math.max(1, Math.min(limit, 25)),
  });

  let delivered = 0;
  for (const row of rows as RewardOutboxRecord[]) {
    if (await deliverOne(row)) delivered += 1;
  }
  return { attempted: rows.length, delivered };
}

export async function drainRewardsAfterCommit(): Promise<void> {
  try {
    await drainCtgOneRewardOutbox(5);
  } catch {
    // Fail open for restaurant operations; durable outbox rows remain retryable.
  }
}
