"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut({ redirect: false });
    } finally {
      router.push("/auth/ctgone/signout?next=/admin/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-pisao-cream-muted hover:text-pisao-gold flex items-center gap-2 text-sm"
    >
      <LogOut className="h-4 w-4" /> Cerrar sesión
    </button>
  );
}
