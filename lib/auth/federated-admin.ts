import "server-only";

import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function federatedActorEmail(subject: string) {
  const normalized = subject.trim();
  if (!normalized) throw new Error("INVALID_FEDERATED_ADMIN_SUBJECT");
  const digest = createHash("sha256").update(normalized, "utf8").digest("hex").slice(0, 32);
  return `ctgone+${digest}@federated.pisao.invalid`;
}

export async function ensureFederatedAdminUser(subject: string) {
  const actorEmail = federatedActorEmail(subject);

  const existing = await prisma.usuario.findUnique({
    where: { email: actorEmail },
  });

  if (existing) {
    if (existing.rol === "ADMIN" && existing.activo) return existing;

    // This address is reserved for federation-only actors. Rotating the random
    // hash on repair guarantees there is never a stable local credential.
    return prisma.usuario.update({
      where: { id: existing.id },
      data: {
        rol: "ADMIN",
        activo: true,
        passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
      },
    });
  }

  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  try {
    return await prisma.usuario.create({
      data: {
        nombre: "CTG One Federated Admin",
        email: actorEmail,
        passwordHash,
        rol: "ADMIN",
        activo: true,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return prisma.usuario.update({
        where: { email: actorEmail },
        data: {
          rol: "ADMIN",
          activo: true,
          passwordHash: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        },
      });
    }
    throw error;
  }
}
