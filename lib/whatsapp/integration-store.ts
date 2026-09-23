import "server-only";

import { prisma } from "@/lib/prisma";
import {
  decryptWhatsAppToken,
  encryptWhatsAppToken,
} from "@/lib/whatsapp/token-vault";

export type WhatsAppIntegrationInput = {
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  accessToken: string;
  status?: string;
  coexistence?: boolean;
};

export async function saveWhatsAppIntegration(
  input: WhatsAppIntegrationInput,
) {
  const encrypted = encryptWhatsAppToken(input.accessToken);
  const now = new Date();

  return prisma.whatsAppIntegration.upsert({
    where: { phoneNumberId: input.phoneNumberId },
    create: {
      wabaId: input.wabaId,
      phoneNumberId: input.phoneNumberId,
      displayPhoneNumber: input.displayPhoneNumber?.slice(0, 32),
      verifiedName: input.verifiedName?.slice(0, 128),
      status: (input.status ?? "ACTIVE").slice(0, 32),
      coexistence: input.coexistence ?? true,
      accessTokenCiphertext: encrypted.ciphertext,
      accessTokenIv: encrypted.iv,
      accessTokenTag: encrypted.tag,
      lastVerifiedAt: now,
    },
    update: {
      wabaId: input.wabaId,
      displayPhoneNumber: input.displayPhoneNumber?.slice(0, 32),
      verifiedName: input.verifiedName?.slice(0, 128),
      status: (input.status ?? "ACTIVE").slice(0, 32),
      coexistence: input.coexistence ?? true,
      accessTokenCiphertext: encrypted.ciphertext,
      accessTokenIv: encrypted.iv,
      accessTokenTag: encrypted.tag,
      lastVerifiedAt: now,
    },
  });
}

export async function getWhatsAppIntegrationCredentials(
  phoneNumberId?: string,
) {
  const integration = phoneNumberId
    ? await prisma.whatsAppIntegration.findUnique({
        where: { phoneNumberId },
      })
    : await prisma.whatsAppIntegration.findFirst({
        where: { status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
      });

  if (!integration) return null;

  return {
    id: integration.id,
    wabaId: integration.wabaId,
    phoneNumberId: integration.phoneNumberId,
    displayPhoneNumber: integration.displayPhoneNumber,
    verifiedName: integration.verifiedName,
    coexistence: integration.coexistence,
    status: integration.status,
    token: decryptWhatsAppToken({
      ciphertext: integration.accessTokenCiphertext,
      iv: integration.accessTokenIv,
      tag: integration.accessTokenTag,
    }),
  };
}

export async function getWhatsAppIntegrationSummary() {
  const integration = await prisma.whatsAppIntegration.findFirst({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      wabaId: true,
      phoneNumberId: true,
      displayPhoneNumber: true,
      verifiedName: true,
      status: true,
      coexistence: true,
      lastVerifiedAt: true,
      updatedAt: true,
    },
  });

  return integration;
}
