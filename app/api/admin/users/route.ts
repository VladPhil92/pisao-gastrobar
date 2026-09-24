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

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function requireSuperAdmin() {
  const session = await auth();
  const user = session?.user as { id?: string; rol?: string } | undefined;
  return user?.id && user.rol === "SUPER_ADMIN" ? user : null;
}

export async function GET() {
  const user = await requireSuperAdmin();
  if (!user) {
    return Response.json({ error: "Solo SUPER_ADMIN puede administrar el equipo." }, { status: 403 });
  }

  return Response.json(await getOwnerGovernanceSnapshot(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const origin = validateCanonicalWriteOrigin(request);
  if (!origin.ok) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const actor = await requireSuperAdmin();
  if (!actor) {
    return Response.json({ error: "Solo SUPER_ADMIN puede crear empleados." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        nombre?: unknown;
        email?: unknown;
        rol?: unknown;
        temporaryPassword?: unknown;
      }
    | null;

  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body?.rol;
  const temporaryPassword =
    typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "";

  if (nombre.length < 2 || nombre.length > 120) {
    return Response.json({ error: "Nombre inválido." }, { status: 400 });
  }
  if (!validEmail(email) || email.length > 180 || isFederatedAdminEmail(email)) {
    return Response.json({ error: "Correo interno inválido." }, { status: 400 });
  }
  if (!isStaffRole(role)) {
    return Response.json({ error: "Rol inválido." }, { status: 400 });
  }
  if (temporaryPassword.length < 12 || temporaryPassword.length > 128) {
    return Response.json(
      { error: "La contraseña temporal debe tener entre 12 y 128 caracteres." },
      { status: 400 },
    );
  }

  try {
    const created = await prisma.usuario.create({
      data: {
        nombre,
        email,
        passwordHash: await bcrypt.hash(temporaryPassword, 12),
        rol: role,
        activo: true,
      },
      select: { id: true, rol: true },
    });

    await recordAdminAudit({
      actorUserId: actor.id,
      actorRole: actor.rol ?? "SUPER_ADMIN",
      action: "STAFF_CREATED",
      targetType: "Usuario",
      targetId: created.id,
      detail: {
        role: created.rol,
        accountType: "LOCAL",
      },
    });

    return Response.json({
      ok: true,
      snapshot: await getOwnerGovernanceSnapshot(),
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return Response.json(
        { error: "Ya existe un usuario interno con ese correo." },
        { status: 409 },
      );
    }
    throw error;
  }
}
