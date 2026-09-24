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
