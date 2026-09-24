import "server-only";

import { prisma } from "@/lib/prisma";
import { isFederatedAdminEmail, publicStaffEmail } from "@/lib/admin/audit";

function safeDetail(
  value: unknown,
): Record<string, string | number | boolean | null> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>)
    .slice(0, 16)
    .filter(([, item]) =>
      item === null ||
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean",
    )
    .map(([key, item]) => [
      key.slice(0, 48),
      typeof item === "string" ? item.slice(0, 160) : item,
    ]);
  return Object.fromEntries(entries);
}

export async function getOwnerGovernanceSnapshot() {
  const [users, audit] = await Promise.all([
    prisma.usuario.findMany({
      orderBy: [{ activo: "desc" }, { rol: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        activo: true,
        sessionVersion: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.adminAuditEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        actorRole: true,
        action: true,
        targetType: true,
        targetId: true,
        outcome: true,
        detail: true,
        createdAt: true,
        actor: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return {
    users: users.map((user) => ({
      id: user.id,
      nombre: user.nombre,
      email: publicStaffEmail(user.email),
      rawEmail: isFederatedAdminEmail(user.email) ? null : user.email,
      rol: user.rol,
      activo: user.activo,
      authSource: isFederatedAdminEmail(user.email) ? "CTG_ONE" : "LOCAL",
      sessionVersion: user.sessionVersion,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    })),
    audit: audit.map((event) => ({
      id: event.id,
      actorName: event.actor?.nombre ?? "Sistema / actor eliminado",
      actorEmail: event.actor
        ? publicStaffEmail(event.actor.email)
        : null,
      actorRole: event.actorRole,
      action: event.action,
      targetType: event.targetType,
      targetId: event.targetId,
      outcome: event.outcome,
      detail: safeDetail(event.detail),
      createdAt: event.createdAt.toISOString(),
    })),
    summary: {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.activo).length,
      activeSuperAdmins: users.filter(
        (user) => user.activo && user.rol === "SUPER_ADMIN",
      ).length,
      localUsers: users.filter((user) => !isFederatedAdminEmail(user.email)).length,
      federatedActors: users.filter((user) => isFederatedAdminEmail(user.email)).length,
    },
  };
}
