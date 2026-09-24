import "server-only";

import { prisma } from "@/lib/prisma";

type AuditDetail = Record<
  string,
  string | number | boolean | null | string[] | number[]
>;

export async function recordAdminAudit(params: {
  actorUserId?: string | null;
  actorRole: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  outcome?: "SUCCESS" | "REJECTED" | "FAILED";
  detail?: AuditDetail;
}) {
  try {
    return await prisma.adminAuditEvent.create({
      data: {
        actorUserId: params.actorUserId ?? null,
        actorRole: params.actorRole.slice(0, 24),
        action: params.action.toUpperCase().replace(/[^A-Z0-9_:.-]/g, "_").slice(0, 64),
        targetType: params.targetType.slice(0, 48),
        targetId: params.targetId?.slice(0, 96) ?? null,
        outcome: params.outcome ?? "SUCCESS",
        detail: params.detail ?? undefined,
      },
      select: { id: true, createdAt: true },
    });
  } catch (error) {
    // La acción principal no debe quedar inconsistente si la bitácora tiene
    // una falla transitoria, pero el incidente sí debe quedar en logs.
    console.error("[PISAO AUDIT] No fue posible persistir evento administrativo", {
      action: params.action,
      targetType: params.targetType,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}

export function isFederatedAdminEmail(email: string) {
  return email.toLowerCase().endsWith("@federated.pisao.invalid");
}

export function publicStaffEmail(email: string) {
  return isFederatedAdminEmail(email) ? "Identidad federada CTG One" : email;
}
