import "server-only";

import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function ensureFederatedAdminUser(email: string) {
  const canonicalEmail = normalizedEmail(email);
  if (!canonicalEmail || !canonicalEmail.includes("@")) {
    throw new Error("INVALID_FEDERATED_ADMIN_EMAIL");
  }

  const existing = await prisma.usuario.findUnique({
    where: { email: canonicalEmail },
  });

  if (existing) {
    if (existing.rol === "ADMIN" && existing.activo) return existing;
    return prisma.usuario.update({
      where: { id: existing.id },
      data: { rol: "ADMIN", activo: true },
    });
  }

  // Federated administrators never authenticate with this local password.
  // A random bcrypt hash satisfies the legacy staff schema without creating
  // a second usable credential that could drift from CTG One.
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  try {
    return await prisma.usuario.create({
      data: {
        nombre: "CTG One Admin",
        email: canonicalEmail,
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
        where: { email: canonicalEmail },
        data: { rol: "ADMIN", activo: true },
      });
    }
    throw error;
  }
}
