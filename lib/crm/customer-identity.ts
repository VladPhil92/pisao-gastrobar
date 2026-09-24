import "server-only";

import { prisma } from "@/lib/prisma";

export function normalizeCustomerEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized && normalized.includes("@") ? normalized : null;
}

export function normalizeCustomerPhone(value: string | null | undefined) {
  const normalized = value?.replace(/[^+\d]/g, "") ?? "";
  return normalized.length >= 7 ? normalized.slice(0, 32) : null;
}

function identityKey(email: string | null, phone: string | null) {
  if (email) return `email:${email}`;
  if (phone) return `phone:${phone}`;
  return null;
}

export async function resolveCrmCustomerProfile(input: {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  source: "ACCOUNT" | "CTG_ONE" | "ORDER" | "RESERVATION";
  accountClienteId?: string | null;
}) {
  const email = normalizeCustomerEmail(input.email);
  const phone = normalizeCustomerPhone(input.telefono);
  const key = identityKey(email, phone);
  if (!key) return null;

  const now = new Date();
  const nombre = input.nombre.trim().slice(0, 120) || "Cliente PISÁO";

  if (email) {
    const byEmail = await prisma.crmCustomerProfile.findUnique({
      where: { identityKey: `email:${email}` },
    });
    if (byEmail) {
      return prisma.crmCustomerProfile.update({
        where: { id: byEmail.id },
        data: {
          nombre,
          phoneNormalized: phone ?? byEmail.phoneNormalized,
          source: input.accountClienteId ? "ACCOUNT" : byEmail.source,
          accountClienteId:
            input.accountClienteId ?? byEmail.accountClienteId ?? undefined,
          lastActivityAt: now,
        },
      });
    }

    if (phone) {
      const phoneOnly = await prisma.crmCustomerProfile.findUnique({
        where: { identityKey: `phone:${phone}` },
      });
      if (phoneOnly && !phoneOnly.emailNormalized) {
        return prisma.crmCustomerProfile.update({
          where: { id: phoneOnly.id },
          data: {
            identityKey: `email:${email}`,
            nombre,
            emailNormalized: email,
            phoneNormalized: phone,
            source: input.accountClienteId ? "ACCOUNT" : input.source,
            accountClienteId: input.accountClienteId ?? undefined,
            lastActivityAt: now,
          },
        });
      }
    }
  }

  return prisma.crmCustomerProfile.upsert({
    where: { identityKey: key },
    create: {
      identityKey: key,
      nombre,
      emailNormalized: email,
      phoneNormalized: phone,
      source: input.accountClienteId ? "ACCOUNT" : input.source,
      accountClienteId: input.accountClienteId ?? undefined,
      lastActivityAt: now,
    },
    update: {
      nombre,
      emailNormalized: email ?? undefined,
      phoneNormalized: phone ?? undefined,
      source: input.accountClienteId ? "ACCOUNT" : input.source,
      accountClienteId: input.accountClienteId ?? undefined,
      lastActivityAt: now,
    },
  });
}

export async function findCrmCustomerByEmail(email: string) {
  const normalized = normalizeCustomerEmail(email);
  if (!normalized) return null;
  return prisma.crmCustomerProfile.findUnique({
    where: { identityKey: `email:${normalized}` },
  });
}
