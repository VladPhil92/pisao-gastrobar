"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("ctgone");
    if (code === "admin_required") {
      setError("La cuenta autenticada en CTG One no tiene rol administrativo.");
    } else if (code === "federation_unavailable") {
      setError("La federación con CTG One no está disponible temporalmente.");
    } else if (code === "federation_exchange_failed") {
      setError("No fue posible validar la sesión de CTG One. Intenta nuevamente.");
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        "Credenciales locales inválidas. Los administradores deben ingresar con CTG One.",
      );
      return;
    }

    router.push("/admin/dashboard");
  };

  return (
    <div className="bg-pisao-carbon flex min-h-screen items-center justify-center px-4 py-10">
      <div className="border-pisao-gold/15 bg-pisao-carbon-soft w-full max-w-md rounded-xl border p-8">
        <Image
          src="/brand/pisao-mark.png"
          alt=""
          width={56}
          height={56}
          className="h-14 w-14"
        />
        <p className="font-display text-pisao-gold mt-3 text-2xl">
          PISÁO Admin
        </p>
        <p className="text-pisao-cream-muted mt-1 text-sm leading-relaxed">
          Administradores: usa tu identidad central de CTG One. Si ya tienes una
          sesión abierta en ctgone.com, el acceso será directo; de lo contrario,
          CTG One solicitará tus mismas credenciales.
        </p>

        <a
          href="/auth/ctgone/start?next=/admin/dashboard"
          className="bg-pisao-gold text-pisao-carbon hover:brightness-105 mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition"
        >
          <LogIn className="h-4 w-4" />
          Ingresar con CTG One
        </a>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <details className="border-pisao-gold/10 mt-6 border-t pt-5">
          <summary className="text-pisao-cream-muted hover:text-pisao-cream cursor-pointer text-xs font-semibold">
            Acceso local de staff — Cajero / Cocina
          </summary>

          <form onSubmit={onSubmit} className="mt-4">
            <p className="text-pisao-cream-muted mb-4 text-xs leading-relaxed">
              Este formulario usa credenciales propias de PISÁO y no la
              contraseña de CTG One.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-pisao-cream-muted text-sm">
                  Correo de staff
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="border-pisao-gold/20 bg-pisao-carbon text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
                />
              </div>
              <div>
                <label className="text-pisao-cream-muted text-sm">
                  Contraseña local
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-pisao-gold/20 bg-pisao-carbon text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="secondary"
              className="mt-5 w-full"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar como staff local"}
            </Button>
          </form>
        </details>
      </div>
    </div>
  );
}
