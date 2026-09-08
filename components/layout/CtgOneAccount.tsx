"use client";

import { LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

type SessionState =
  | { loading: true; connected: false; email?: never }
  | { loading: false; connected: false; email?: never }
  | { loading: false; connected: true; email: string };

export function CtgOneAccount() {
  const [session, setSession] = useState<SessionState>({ loading: true, connected: false });

  useEffect(() => {
    let active = true;
    void fetch("/api/ctgone/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("session lookup failed");
        return response.json() as Promise<{ connected: boolean; email?: string }>;
      })
      .then((data) => {
        if (!active) return;
        if (data.connected && data.email) {
          setSession({ loading: false, connected: true, email: data.email });
        } else {
          setSession({ loading: false, connected: false });
        }
      })
      .catch(() => {
        if (active) setSession({ loading: false, connected: false });
      });

    return () => {
      active = false;
    };
  }, []);

  if (session.loading) {
    return (
      <span
        className="border-pisao-gold/20 text-pisao-cream-muted hidden h-9 items-center rounded-full border px-3 text-xs sm:inline-flex"
        aria-label="Consultando cuenta CTG One"
      >
        CTG One
      </span>
    );
  }

  if (!session.connected) {
    return (
      <a
        href="/auth/ctgone/start"
        className="border-pisao-gold/25 text-pisao-cream-muted hover:border-pisao-gold/50 hover:text-pisao-gold hidden h-9 items-center gap-2 rounded-full border px-3 text-xs transition-colors sm:inline-flex"
      >
        <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
        Entrar con CTG One
      </a>
    );
  }

  return (
    <div className="border-pisao-gold/25 bg-pisao-gold/5 hidden h-9 items-center gap-2 rounded-full border px-3 sm:flex">
      <a
        href="/mi-cuenta"
        className="flex min-w-0 items-center gap-2"
        title={session.email}
        aria-label="Abrir Mi PISÁO"
      >
        <UserRound className="text-pisao-gold h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="text-pisao-cream max-w-32 truncate text-xs">Mi PISÁO</span>
      </a>
      <a
        href="/auth/ctgone/logout"
        className="text-pisao-cream-muted hover:text-pisao-gold transition-colors"
        aria-label="Cerrar sesión CTG One en PISÁO"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </div>
  );
}
