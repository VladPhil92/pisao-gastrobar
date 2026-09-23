import "server-only";

import { prisma } from "@/lib/prisma";
import {
  sanitizeHospitalityProfile,
  type HospitalityAnalysis,
  type HospitalityProfile,
} from "@/lib/ai/hospitality-brain";
import type { PisaoAgentId } from "@/lib/ai/pisao-agents";

const KEY_PATTERN = /^[A-Za-z0-9_-]{16,96}$/;

function validKey(value: unknown): value is string {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

function unique(values: string[]) {
  return [...new Set(values)].slice(0, 6);
}

export function mergeHospitalityProfiles(
  persistent: HospitalityProfile | null,
  client: HospitalityProfile,
): HospitalityProfile {
  if (!persistent) return client;

  return sanitizeHospitalityProfile({
    version: 1,
    interactionCount: Math.max(
      persistent.interactionCount,
      client.interactionCount,
    ),
    conversationStyle:
      client.conversationStyle ?? persistent.conversationStyle,
    preferredFoodSignals: unique([
      ...persistent.preferredFoodSignals,
      ...client.preferredFoodSignals,
    ]),
    preferredDrinkSignals: unique([
      ...persistent.preferredDrinkSignals,
      ...client.preferredDrinkSignals,
    ]),
    lastIntent: client.lastIntent ?? persistent.lastIntent,
    lastGuestState: client.lastGuestState ?? persistent.lastGuestState,
  });
}

export async function loadPersistentHospitalityProfile(
  guestKey: unknown,
): Promise<HospitalityProfile | null> {
  if (!validKey(guestKey)) return null;

  try {
    const profile = await prisma.aiGuestProfile.findUnique({
      where: { guestKey },
      select: {
        interactionCount: true,
        conversationStyle: true,
        preferredFoodSignals: true,
        preferredDrinkSignals: true,
        lastIntent: true,
        lastGuestState: true,
      },
    });

    if (!profile) return null;
    return sanitizeHospitalityProfile({
      version: 1,
      ...profile,
    });
  } catch (error) {
    console.warn("[PISAO AI MEMORY] read degraded", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}

export async function persistConciergeState(params: {
  guestKey: unknown;
  sessionKey: unknown;
  profile: HospitalityProfile;
  analysis: HospitalityAnalysis;
  agent: PisaoAgentId;
  model: string;
  outcome: string;
  fallback: boolean;
  latencyMs: number;
  reservationIntent: boolean;
  proposalCreated: boolean;
  messageCount: number;
}) {
  if (!validKey(params.guestKey) || !validKey(params.sessionKey)) {
    return { persisted: false as const, reason: "identity_unavailable" as const };
  }

  const guestKey = params.guestKey;
  const sessionKey = params.sessionKey;

  try {
    await prisma.$transaction(async (tx) => {
      const guest = await tx.aiGuestProfile.upsert({
        where: { guestKey },
        create: {
          guestKey,
          interactionCount: params.profile.interactionCount,
          conversationStyle: params.profile.conversationStyle,
          preferredFoodSignals: params.profile.preferredFoodSignals,
          preferredDrinkSignals: params.profile.preferredDrinkSignals,
          lastIntent: params.profile.lastIntent,
          lastGuestState: params.profile.lastGuestState,
          lastSeenAt: new Date(),
        },
        update: {
          interactionCount: params.profile.interactionCount,
          conversationStyle: params.profile.conversationStyle,
          preferredFoodSignals: params.profile.preferredFoodSignals,
          preferredDrinkSignals: params.profile.preferredDrinkSignals,
          lastIntent: params.profile.lastIntent,
          lastGuestState: params.profile.lastGuestState,
          lastSeenAt: new Date(),
        },
      });

      const session = await tx.aiConversationSession.upsert({
        where: { sessionKey },
        create: {
          sessionKey,
          guestProfileId: guest.id,
          messageCount: params.messageCount,
          lastAgent: params.agent,
          lastIntent: params.analysis.intent,
          lastOutcome: params.outcome,
          lastSeenAt: new Date(),
        },
        update: {
          guestProfileId: guest.id,
          messageCount: params.messageCount,
          lastAgent: params.agent,
          lastIntent: params.analysis.intent,
          lastOutcome: params.outcome,
          lastSeenAt: new Date(),
        },
      });

      await tx.aiConciergeRun.create({
        data: {
          sessionId: session.id,
          guestProfileId: guest.id,
          model: params.model.slice(0, 64),
          agent: params.agent,
          intent: params.analysis.intent,
          outcome: params.outcome.slice(0, 48),
          fallback: params.fallback,
          latencyMs: Math.max(0, Math.round(params.latencyMs)),
          reservationIntent: params.reservationIntent,
          proposalCreated: params.proposalCreated,
        },
      });
    });

    return { persisted: true as const };
  } catch (error) {
    console.warn("[PISAO AI MEMORY] write degraded", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return { persisted: false as const, reason: "database_unavailable" as const };
  }
}
