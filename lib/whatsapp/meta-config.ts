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


export const META_ACCESS_VERIFICATION_STATUSES = [
  "NOT_STARTED",
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;

export const META_APP_REVIEW_STATUSES = [
  "NOT_STARTED",
  "READY",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
] as const;

export type MetaAccessVerificationStatus =
  (typeof META_ACCESS_VERIFICATION_STATUSES)[number];
export type MetaAppReviewStatus =
  (typeof META_APP_REVIEW_STATUSES)[number];

function normalizeStatus<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): T[number] | null {
  return typeof value === "string" && allowed.includes(value)
    ? (value as T[number])
    : null;
}

export async function getMetaReviewLifecycle() {
  const saved = await prisma.whatsAppMetaConfig.findUnique({
    where: { id: PRIMARY_ID },
    select: {
      metaAccessVerificationStatus: true,
      metaAccessVerificationUpdatedAt: true,
      metaAppReviewStatus: true,
      metaAppReviewUpdatedAt: true,
    },
  });

  return {
    accessVerificationStatus:
      normalizeStatus(
        saved?.metaAccessVerificationStatus,
        META_ACCESS_VERIFICATION_STATUSES,
      ) ?? "PENDING",
    accessVerificationUpdatedAt:
      saved?.metaAccessVerificationUpdatedAt ?? null,
    appReviewStatus:
      normalizeStatus(saved?.metaAppReviewStatus, META_APP_REVIEW_STATUSES) ??
      "NOT_STARTED",
    appReviewUpdatedAt: saved?.metaAppReviewUpdatedAt ?? null,
  };
}

export async function saveMetaReviewLifecycle(params: {
  accessVerificationStatus?: unknown;
  appReviewStatus?: unknown;
  updatedByUserId?: string | null;
}) {
  const accessVerificationStatus = normalizeStatus(
    params.accessVerificationStatus,
    META_ACCESS_VERIFICATION_STATUSES,
  );
  const appReviewStatus = normalizeStatus(
    params.appReviewStatus,
    META_APP_REVIEW_STATUSES,
  );

  if (!accessVerificationStatus && !appReviewStatus) {
    throw new Error("INVALID_META_REVIEW_STATUS");
  }

  const now = new Date();
  return prisma.whatsAppMetaConfig.upsert({
    where: { id: PRIMARY_ID },
    create: {
      id: PRIMARY_ID,
      ...(accessVerificationStatus
        ? {
            metaAccessVerificationStatus: accessVerificationStatus,
            metaAccessVerificationUpdatedAt: now,
          }
        : {}),
      ...(appReviewStatus
        ? {
            metaAppReviewStatus: appReviewStatus,
            metaAppReviewUpdatedAt: now,
          }
        : {}),
      updatedByUserId: params.updatedByUserId?.slice(0, 64) || null,
    },
    update: {
      ...(accessVerificationStatus
        ? {
            metaAccessVerificationStatus: accessVerificationStatus,
            metaAccessVerificationUpdatedAt: now,
          }
        : {}),
      ...(appReviewStatus
        ? {
            metaAppReviewStatus: appReviewStatus,
            metaAppReviewUpdatedAt: now,
          }
        : {}),
      updatedByUserId: params.updatedByUserId?.slice(0, 64) || null,
    },
  });
}
