import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SignOutButton } from "@/components/admin/SignOutButton";
import type { Rol } from "@/lib/auth/roles";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const rol = ((session.user as { rol?: string }).rol ?? "COCINA") as Rol;

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[240px_1fr]">
      <aside className="border-pisao-gold/10 bg-pisao-carbon-soft border-b lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2 px-4 py-4">
          <Image
            src="/brand/pisao-mark.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7"
          />
          <p className="font-display text-pisao-gold text-lg">PISÁO Admin</p>
        </div>
        <AdminSidebar rol={rol} />
        <div className="border-pisao-gold/10 border-t px-4 py-4">
          <p className="text-pisao-cream-muted text-xs">{session.user.name}</p>
          <p className="text-pisao-gold text-xs">{rol}</p>
          <div className="mt-3">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="bg-pisao-carbon p-6">{children}</main>
    </div>
  );
}
