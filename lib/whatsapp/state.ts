import "server-only";

import { prisma } from "@/lib/prisma";
import { deriveWhatsAppIdentity } from "@/lib/whatsapp/webhook-security";

function handoffMinutes() {
  const parsed = Number(process.env.WHATSAPP_HUMAN_HANDOFF_MINUTES ?? "20");
  if (!Number.isFinite(parsed)) return 20;
  return Math.min(120, Math.max(5, Math.round(parsed)));
}

function conversationKey(customerKey: string, phoneNumberId?: string) {
  return `${customerKey}:${phoneNumberId?.slice(0, 32) || "default"}`.slice(0, 96);
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
  try {
    await prisma.whatsAppWebhookEvent.create({
      data: {
        eventKey: params.eventKey.slice(0, 128),
        field: params.field.slice(0, 48),
        phoneNumberId: params.phoneNumberId?.slice(0, 32),
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
        where: { eventKey: params.eventKey.slice(0, 128) },
        select: { processedAt: true, receivedAt: true },
      });

      if (!existing || existing.processedAt) return false;

      // Permite que Meta recupere un evento abandonado tras fallo/crash,
      // pero evita procesamiento concurrente de reintentos inmediatos.
      const staleBefore = new Date(Date.now() - 2 * 60 * 1000);
      if (existing.receivedAt > staleBefore) return false;

      const reclaimed = await prisma.whatsAppWebhookEvent.updateMany({
        where: {
          eventKey: params.eventKey.slice(0, 128),
          processedAt: null,
          receivedAt: { lte: staleBefore },
        },
        data: { receivedAt: new Date() },
      });

      return reclaimed.count > 0;
    }
    throw error;
  }
}

export async function markWhatsAppWebhookProcessed(eventKey: string) {
  await prisma.whatsAppWebhookEvent.updateMany({
    where: { eventKey: eventKey.slice(0, 128) },
    data: { processedAt: new Date() },
  });
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
