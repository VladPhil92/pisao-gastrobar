"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, UserPlus, UsersRound } from "lucide-react";

type Mode = "login" | "register";

export function AccountAccess() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const endpoint = mode === "login" ? "/api/account/login" : "/api/account/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nombre, telefono, email, password }),
    });

    setPending(false);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      const message =
        body.error === "EMAIL_ALREADY_REGISTERED"
          ? "Ese correo ya tiene una cuenta. Inicia sesión."
          : body.error === "INVALID_CREDENTIALS"
            ? "Correo o contraseña incorrectos."
            : body.error === "INVALID_INPUT"
              ? "Revisa tus datos. La contraseña debe tener al menos 8 caracteres."
              : "No pudimos completar el acceso. Intenta nuevamente.";
      setError(message);
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_.78fr]">
      <section className="rounded-[2rem] border border-pisao-gold/15 bg-pisao-noche/80 p-5 sm:p-7">
        <div className="flex rounded-2xl border border-pisao-gold/10 bg-pisao-carbon p-1">
          <button
            type="button"
            onClick={() => { setMode("login"); setError(null); }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "login" ? "bg-pisao-gold text-pisao-carbon" : "text-pisao-cream-muted"}`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode("register"); setError(null); }}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition ${mode === "register" ? "bg-pisao-gold text-pisao-carbon" : "text-pisao-cream-muted"}`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-pisao-cream-muted">Nombre</span>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-4 py-3 text-sm text-pisao-cream outline-none focus:border-pisao-gold/50"
                  autoComplete="name"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-pisao-cream-muted">Teléfono <span className="font-normal">(opcional)</span></span>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-4 py-3 text-sm text-pisao-cream outline-none focus:border-pisao-gold/50"
                  autoComplete="tel"
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-pisao-cream-muted">Correo electrónico</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-4 py-3 text-sm text-pisao-cream outline-none focus:border-pisao-gold/50"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-pisao-cream-muted">Contraseña</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-pisao-gold/15 bg-pisao-carbon px-4 py-3 text-sm text-pisao-cream outline-none focus:border-pisao-gold/50"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>

          {error && <p className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-xs text-red-300">{error}</p>}

          <button
            disabled={pending}
            type="submit"
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-pisao-gold px-4 py-3 text-sm font-bold text-pisao-carbon transition hover:brightness-105 disabled:opacity-60"
          >
            {mode === "login" ? <LockKeyhole className="size-4" /> : <UserPlus className="size-4" />}
            {pending ? "Procesando..." : mode === "login" ? "Entrar a mi cuenta" : "Crear mi perfil PISÁO"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-pisao-gold/10" />
          <span className="text-[10px] font-semibold tracking-[.16em] text-pisao-cream-muted uppercase">o continúa con</span>
          <span className="h-px flex-1 bg-pisao-gold/10" />
        </div>

        <a
          href="/auth/ctgone/start?next=/micuenta"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-pisao-gold/30 px-4 py-3 text-sm font-semibold text-pisao-cream transition hover:bg-pisao-gold/10 hover:text-pisao-gold"
        >
          CTG One
          <ArrowRight className="size-4" />
        </a>
        <p className="mt-3 text-center text-[11px] leading-relaxed text-pisao-cream-muted">
          CTG One es opcional. También puedes usar una cuenta propia de PISÁO.
        </p>
      </section>

      <aside className="rounded-[2rem] border border-pisao-gold/10 bg-pisao-carbon-soft p-5 sm:p-7">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-pisao-gold/10 text-pisao-gold">
          <UsersRound className="size-5" />
        </div>
        <p className="mt-5 text-[10px] font-semibold tracking-[.18em] text-pisao-gold uppercase">Equipo PISÁO</p>
        <h2 className="font-display mt-2 text-3xl text-pisao-cream">Administración y operación</h2>
        <p className="mt-3 text-sm leading-relaxed text-pisao-cream-muted">
          Administradores, caja y cocina ingresan por el backoffice. Allí pueden usar credenciales propias de PISÁO y, cuando corresponda, CTG One.
        </p>
        <Link
          href="/admin/login"
          className="mt-6 flex items-center justify-between rounded-xl border border-pisao-gold/15 px-4 py-3 text-sm font-semibold text-pisao-cream transition hover:border-pisao-gold/40 hover:text-pisao-gold"
        >
          Acceso de empleados y administradores
          <ArrowRight className="size-4" />
        </Link>
      </aside>
    </div>
  );
}
