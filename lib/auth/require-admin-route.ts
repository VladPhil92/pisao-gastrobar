import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { ROLES, tieneAcceso, type Rol } from "@/lib/auth/roles";

export async function requireAdminRoute(route: string) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");

  const rawRole = (session.user as { rol?: string }).rol;
  const role = ROLES.includes(rawRole as Rol) ? (rawRole as Rol) : null;
  if (!role || !tieneAcceso(route, role)) redirect("/admin/dashboard");

  return { session, role };
}
