import "server-only";

import { prisma } from "@/lib/prisma";

const CONFIG_ID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;
const PRIMARY_ID = "primary";

export function normalizeEmbeddedSignupConfigId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return CONFIG_ID_PATTERN.test(normalized) ? normalized : null;
}

export async function getEmbeddedSignupConfigId(): Promise<string | null> {
  const saved = await prisma.whatsAppMetaConfig.findUnique({
    where: { id: PRIMARY_ID },
    select: { embeddedSignupConfigId: true },
  });
  const persisted = normalizeEmbeddedSignupConfigId(saved?.embeddedSignupConfigId);
  if (persisted) return persisted;

  return normalizeEmbeddedSignupConfigId(
    process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID,
  );
}

export async function saveEmbeddedSignupConfigId(
  configId: string,
  updatedByUserId?: string | null,
) {
  const normalized = normalizeEmbeddedSignupConfigId(configId);
  if (!normalized) throw new Error("INVALID_EMBEDDED_SIGNUP_CONFIG_ID");

  return prisma.whatsAppMetaConfig.upsert({
    where: { id: PRIMARY_ID },
    create: {
      id: PRIMARY_ID,
      embeddedSignupConfigId: normalized,
      updatedByUserId: updatedByUserId?.slice(0, 64) || null,
    },
    update: {
      embeddedSignupConfigId: normalized,
      updatedByUserId: updatedByUserId?.slice(0, 64) || null,
    },
  });
}

export async function getWhatsAppRuntimeState() {
  const saved = await prisma.whatsAppMetaConfig.findUnique({
    where: { id: PRIMARY_ID },
    select: {
      runtimeEnabled: true,
      lastProbeAt: true,
      lastProbeStatus: true,
      lastProbeCode: true,
      lastAutoPauseAt: true,
      lastAutoPauseReason: true,
    },
  });

  const forceDisabled =
    process.env.WHATSAPP_WEBHOOK_FORCE_DISABLED === "true";
  const legacyEnabled = process.env.WHATSAPP_WEBHOOK_ENABLED === "true";
  const managed = typeof saved?.runtimeEnabled === "boolean";

  return {
    enabled: forceDisabled
      ? false
      : managed
        ? Boolean(saved?.runtimeEnabled)
        : legacyEnabled,
    managed,
    forceDisabled,
    lastProbeAt: saved?.lastProbeAt ?? null,
    lastProbeStatus: saved?.lastProbeStatus ?? null,
    lastProbeCode: saved?.lastProbeCode ?? null,
    lastAutoPauseAt: saved?.lastAutoPauseAt ?? null,
    lastAutoPauseReason: saved?.lastAutoPauseReason ?? null,
  };
}

export async function setWhatsAppRuntimeEnabled(
  enabled: boolean,
  updatedByUserId?: string | null,
) {
  if (process.env.WHATSAPP_WEBHOOK_FORCE_DISABLED === "true" && enabled) {
    throw new Error("WHATSAPP_FORCE_DISABLED");
  }

  return prisma.whatsAppMetaConfig.upsert({
    where: { id: PRIMARY_ID },
    create: {
      id: PRIMARY_ID,
      runtimeEnabled: enabled,
      updatedByUserId: updatedByUserId?.slice(0, 64) || null,
    },
    update: {
      runtimeEnabled: enabled,
      updatedByUserId: updatedByUserId?.slice(0, 64) || null,
    },
  });
}

export async function recordWhatsAppProbe(params: {
  ok: boolean;
  code: string;
  updatedByUserId?: string | null;
}) {
  const now = new Date();
  return prisma.whatsAppMetaConfig.upsert({
    where: { id: PRIMARY_ID },
    create: {
      id: PRIMARY_ID,
      lastProbeAt: now,
      lastProbeStatus: params.ok ? "SUCCESS" : "FAILED",
      lastProbeCode: params.code.slice(0, 64),
      updatedByUserId: params.updatedByUserId?.slice(0, 64) || null,
    },
    update: {
      lastProbeAt: now,
      lastProbeStatus: params.ok ? "SUCCESS" : "FAILED",
      lastProbeCode: params.code.slice(0, 64),
      updatedByUserId: params.updatedByUserId?.slice(0, 64) || null,
    },
  });
}
