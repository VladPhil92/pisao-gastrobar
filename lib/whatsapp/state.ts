import "server-only";

import { prisma } from "@/lib/prisma";
import { deriveWhatsAppIdentity } from "@/lib/whatsapp/webhook-security";

function handoffMinutes() {
  const parsed = Number(process.env.WHATSAPP_HUMAN_HANDOFF_MINUTES ?? "20");
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(120, Math.max(5, Math.round(parsed)));
}

function failureWindowMinutes() {
  const parsed = Number(
    process.env.WHATSAPP_FAILURE_AUTOPAUSE_WINDOW_MINUTES ?? "10",
  );
  if (!Number.isFinite(parsed)) return 10;
  return Math.min(60, Math.max(2, Math.round(parsed)));
}

function failureThreshold() {
  const parsed = Number(
    process.env.WHATSAPP_FAILURE_AUTOPAUSE_THRESHOLD ?? "5",
  );
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(50, Math.max(2, Math.round(parsed)));
}

function conversationKey(customerKey: string, phoneNumberId?: string) {
  return `${customerKey}:${phoneNumberId?.slice(0, 32) || "default"}`.slice(
    0,
    96,
  );
}

async function integrationIdForPhone(phoneNumberId?: string) {
  if (!phoneNumberId) return null;
  const integration = await prisma.whatsAppIntegration.findUnique({
    where: { phoneNumberId },
    select: { id: true },
  });
  return integration?.id ?? null;
}

export async function claimWhatsAppWebhookEvent(params: {
  eventKey: string;
  field: string;
  phoneNumberId?: string;
}) {
  const eventKey = params.eventKey.slice(0, 128);

  try {
    await prisma.whatsAppWebhookEvent.create({
      data: {
        eventKey,
        field: params.field.slice(0, 48),
        phoneNumberId: params.phoneNumberId?.slice(0, 32),
        status: "RECEIVED",
        attemptCount: 1,
      },
    });
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      const existing = await prisma.whatsAppWebhookEvent.findUnique({
        where: { eventKey },
        select: {
          processedAt: true,
          receivedAt: true,
          status: true,
        },
      });

      if (!existing || existing.processedAt) return false;

      // Permite recuperar eventos abandonados o reintentados sin ejecutar
      // duplicados concurrentes.
      const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
      if (
        existing.status !== "FAILED" &&
        existing.receivedAt > staleBefore
      ) {
        return false;
      }

      const reclaimed = await prisma.whatsAppWebhookEvent.updateMany({
        where: {
          eventKey,
          processedAt: null,
          ...(existing.status !== "FAILED"
            ? { receivedAt: { lte: staleBefore } }
            : {}),
        },
        data: {
          receivedAt: new Date(),
          status: "RECEIVED",
          failedAt: null,
          failureCode: null,
          attemptCount: { increment: 1 },
        },
      });

      return reclaimed.count > 0;
    }
    throw error;
  }
}

export async function markWhatsAppWebhookProcessed(eventKey: string) {
  await prisma.whatsAppWebhookEvent.updateMany({
    where: { eventKey: eventKey.slice(0, 128) },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
      failedAt: null,
      failureCode: null,
    },
  });
}

export async function markWhatsAppWebhookFailed(
  eventKey: string,
  failureCode: string,
) {
  const now = new Date();
  const safeCode = failureCode
    .toUpperCase()
    .replace(/[^A-Z0-9_:-]/g, "_")
    .slice(0, 64);

  await prisma.whatsAppWebhookEvent.updateMany({
    where: { eventKey: eventKey.slice(0, 128) },
    data: {
      status: "FAILED",
      failedAt: now,
      failureCode: safeCode || "PROCESSING_FAILED",
    },
  });

  const since = new Date(
    now.getTime() - failureWindowMinutes() * 60 * 1000,
  );
  const recentFailures = await prisma.whatsAppWebhookEvent.count({
    where: {
      field: "messages",
      status: "FAILED",
      failedAt: { gte: since },
    },
  });

  if (recentFailures >= failureThreshold()) {
    await prisma.whatsAppMetaConfig.upsert({
      where: { id: "primary" },
      create: {
        id: "primary",
        runtimeEnabled: false,
        lastAutoPauseAt: now,
        lastAutoPauseReason: `FAILURE_BURST_${recentFailures}`.slice(0, 96),
        updatedByUserId: "system:whatsapp-v5",
      },
      update: {
        runtimeEnabled: false,
        lastAutoPauseAt: now,
        lastAutoPauseReason: `FAILURE_BURST_${recentFailures}`.slice(0, 96),
        updatedByUserId: "system:whatsapp-v5",
      },
    });
  }

  return {
    recentFailures,
    autoPaused: recentFailures >= failureThreshold(),
  };
}

export async function recordWhatsAppInbound(params: {
  waId: string;
  phoneNumberId?: string;
}) {
  const { identity } = deriveWhatsAppIdentity(params.waId);
  const integrationId = await integrationIdForPhone(params.phoneNumberId);

  const key = conversationKey(identity, params.phoneNumberId);

  await prisma.whatsAppConversation.upsert({
    where: { conversationKey: key },
    create: {
      conversationKey: key,
      customerKey: identity,
      integrationId,
      phoneNumberId: params.phoneNumberId?.slice(0, 32),
      lastInboundAt: new Date(),
    },
    update: {
      ...(integrationId ? { integrationId } : {}),
      ...(params.phoneNumberId
        ? { phoneNumberId: params.phoneNumberId.slice(0, 32) }
        : {}),
      lastInboundAt: new Date(),
    },
  });
}

export async function recordWhatsAppAiOutbound(params: {
  waId: string;
  phoneNumberId?: string;
}) {
  const { identity } = deriveWhatsAppIdentity(params.waId);
  const integrationId = await integrationIdForPhone(params.phoneNumberId);

  const key = conversationKey(identity, params.phoneNumberId);

  await prisma.whatsAppConversation.upsert({
    where: { conversationKey: key },
    create: {
      conversationKey: key,
      customerKey: identity,
      integrationId,
      phoneNumberId: params.phoneNumberId?.slice(0, 32),
      lastAiMessageAt: new Date(),
    },
    update: {
      ...(integrationId ? { integrationId } : {}),
      ...(params.phoneNumberId
        ? { phoneNumberId: params.phoneNumberId.slice(0, 32) }
        : {}),
      lastAiMessageAt: new Date(),
    },
  });
}

export async function recordWhatsAppHumanEcho(params: {
  customerWaId: string;
  phoneNumberId?: string;
}) {
  const { identity } = deriveWhatsAppIdentity(params.customerWaId);
  const integrationId = await integrationIdForPhone(params.phoneNumberId);
  const now = new Date();
  const humanHandoffUntil = new Date(
    now.getTime() + handoffMinutes() * 60 * 1000,
  );

  const key = conversationKey(identity, params.phoneNumberId);

  await prisma.whatsAppConversation.upsert({
    where: { conversationKey: key },
    create: {
      conversationKey: key,
      customerKey: identity,
      integrationId,
      phoneNumberId: params.phoneNumberId?.slice(0, 32),
      lastHumanMessageAt: now,
      humanHandoffUntil,
    },
    update: {
      ...(integrationId ? { integrationId } : {}),
      ...(params.phoneNumberId
        ? { phoneNumberId: params.phoneNumberId.slice(0, 32) }
        : {}),
      lastHumanMessageAt: now,
      humanHandoffUntil,
    },
  });

  return humanHandoffUntil;
}

export async function releaseWhatsAppHumanHandoff(conversationId: string) {
  return prisma.whatsAppConversation.update({
    where: { id: conversationId },
    data: { humanHandoffUntil: new Date() },
    select: { id: true },
  });
}

export async function whatsappHumanHandoffActive(
  waId: string,
  phoneNumberId?: string,
) {
  const { identity } = deriveWhatsAppIdentity(waId);
  const conversation = await prisma.whatsAppConversation.findUnique({
    where: { conversationKey: conversationKey(identity, phoneNumberId) },
    select: { humanHandoffUntil: true },
  });

  return Boolean(
    conversation?.humanHandoffUntil &&
      conversation.humanHandoffUntil.getTime() > Date.now(),
  );
}
