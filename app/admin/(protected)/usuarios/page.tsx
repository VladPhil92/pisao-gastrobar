import { OwnerGovernanceManager } from "@/components/admin/OwnerGovernanceManager";
import { requireAdminRoute } from "@/lib/auth/require-admin-route";
import { getOwnerGovernanceSnapshot } from "@/lib/admin/governance";

export default async function AdminUsersPage() {
  const { session } = await requireAdminRoute("/admin/usuarios");
  const user = session.user as { id?: string };
  const snapshot = await getOwnerGovernanceSnapshot();

  return (
    <div className="mx-auto max-w-[1500px] space-y-7">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[.22em] text-pisao-gold">
          Owner Governance · IAM V10
        </p>
        <h1 className="font-display mt-2 text-4xl text-pisao-cream">
          Equipo, autoridad y trazabilidad
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-pisao-cream-muted">
          Gestiona accesos internos, revoca sesiones y revisa acciones sensibles
          desde una consola exclusiva de SUPER_ADMIN.
        </p>
      </header>

      <OwnerGovernanceManager
        initial={snapshot}
        currentUserId={user.id ?? ""}
      />
    </div>
  );
}
