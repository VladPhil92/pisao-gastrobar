import bcrypt from "bcryptjs";

import { auth } from "@/lib/auth";
import { isFederatedAdminEmail, recordAdminAudit } from "@/lib/admin/audit";
import { getOwnerGovernanceSnapshot } from "@/lib/admin/governance";
import { prisma } from "@/lib/prisma";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";

const STAFF_ROLES = ["SUPER_ADMIN", "ADMIN", "CAJERO", "COCINA"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && STAFF_ROLES.includes(value as StaffRole);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const origin = validateCanonicalWriteOrigin(request);
  if (!origin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const session = await auth();
  const actor = session?.user as { id?: string; rol?: string } | undefined;
  if (!actor?.id || actor.rol !== "SUPER_ADMIN") {
    return Response.json(
      { error: "Solo SUPER_ADMIN puede modificar accesos." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const target = await prisma.usuario.findUnique({ where: { id } });
  if (!target) {
    return Response.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (isFederatedAdminEmail(target.email)) {
    return Response.json(
      {
        error:
          "Las identidades federadas de CTG One se gobiernan desde la federación y no pueden modificarse como cuentas locales.",
      },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | {
        nombre?: unknown;
        rol?: unknown;
        activo?: unknown;
        resetPassword?: unknown;
        revokeSessions?: unknown;
      }
    | null;

  const changes: {
    nombre?: string;
    rol?: StaffRole;
    activo?: boolean;
    passwordHash?: string;
    sessionVersion?: { increment: number };
  } = {};
  const changedFields: string[] = [];
  let invalidateSessions = body?.revokeSessions === true;

  if (body?.nombre !== undefined) {
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    if (nombre.length < 2 || nombre.length > 120) {
      return Response.json({ error: "Nombre inválido." }, { status: 400 });
    }
    if (nombre !== target.nombre) {
      changes.nombre = nombre;
      changedFields.push("nombre");
    }
  }

  if (body?.rol !== undefined) {
    if (!isStaffRole(body.rol)) {
      return Response.json({ error: "Rol inválido." }, { status: 400 });
    }
    if (actor.id === target.id && body.rol !== "SUPER_ADMIN") {
      return Response.json(
        { error: "No puedes retirar tu propio rol SUPER_ADMIN." },
        { status: 409 },
      );
    }
    if (body.rol !== target.rol) {
      changes.rol = body.rol;
      changedFields.push("rol");
      invalidateSessions = true;
    }
  }

  if (body?.activo !== undefined) {
    if (typeof body.activo !== "boolean") {
      return Response.json({ error: "Estado inválido." }, { status: 400 });
    }
    if (actor.id === target.id && body.activo === false) {
      return Response.json(
        { error: "No puedes desactivar tu propia cuenta." },
        { status: 409 },
      );
    }
    if (body.activo !== target.activo) {
      changes.activo = body.activo;
      changedFields.push("activo");
      invalidateSessions = true;
    }
  }

  if (
    target.rol === "SUPER_ADMIN" &&
    ((changes.rol && changes.rol !== "SUPER_ADMIN") || changes.activo === false)
  ) {
    const activeSuperAdmins = await prisma.usuario.count({
      where: { rol: "SUPER_ADMIN", activo: true },
    });
    if (activeSuperAdmins <= 1) {
      return Response.json(
        { error: "Debe permanecer al menos un SUPER_ADMIN activo." },
        { status: 409 },
      );
    }
  }

  if (body?.resetPassword !== undefined) {
    const password =
      typeof body.resetPassword === "string" ? body.resetPassword : "";
    if (password.length < 12 || password.length > 128) {
      return Response.json(
        { error: "La nueva contraseña debe tener entre 12 y 128 caracteres." },
        { status: 400 },
      );
    }
    changes.passwordHash = await bcrypt.hash(password, 12);
    changedFields.push("password");
    invalidateSessions = true;
  }

  if (invalidateSessions) {
    changes.sessionVersion = { increment: 1 };
    if (body?.revokeSessions === true) changedFields.push("sessions");
  }

  if (!changedFields.length) {
    return Response.json({
      ok: true,
      snapshot: await getOwnerGovernanceSnapshot(),
    });
  }

  const updated = await prisma.usuario.update({
    where: { id },
    data: changes,
    select: { id: true, rol: true, activo: true, sessionVersion: true },
  });

  await recordAdminAudit({
    actorUserId: actor.id,
    actorRole: actor.rol,
    action: "STAFF_ACCESS_UPDATED",
    targetType: "Usuario",
    targetId: updated.id,
    detail: {
      changedFields: changedFields.join(","),
      role: updated.rol,
      active: updated.activo,
      sessionsRevoked: invalidateSessions,
    },
  });

  return Response.json({
    ok: true,
    snapshot: await getOwnerGovernanceSnapshot(),
  });
}
