"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  async function handleSignOut() {
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.assign("/auth/ctgone/signout?next=/admin/login");
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
