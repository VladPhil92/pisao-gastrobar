"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
      className="text-pisao-cream-muted hover:text-pisao-gold flex items-center gap-2 text-sm"
    >
      <LogOut className="h-4 w-4" /> Cerrar sesión
    </button>
  );
}
