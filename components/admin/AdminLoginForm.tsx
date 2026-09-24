"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function AdminLoginForm({
  federationError,
}: {
  federationError?: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setLocalError(
        "Correo o contraseña incorrectos.",
      );
      return;
    }

    router.push("/admin/dashboard");
  };

  const error = localError ?? federationError;

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
          Administradores y empleados pueden ingresar con sus credenciales de PISÁO.
          Si tu cuenta está federada, también puedes continuar con CTG One.
        </p>

        <a
          href="/auth/ctgone/start?next=/admin/dashboard"
          className="bg-pisao-gold text-pisao-carbon hover:brightness-105 mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition"
        >
          <LogIn className="h-4 w-4" />
          Continuar con CTG One
        </a>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="border-pisao-gold/10 mt-6 border-t pt-5">
          <p className="text-pisao-cream-muted text-xs font-semibold">
            Acceso con correo y contraseña
          </p>

          <form onSubmit={onSubmit} className="mt-4">
            <p className="text-pisao-cream-muted mb-4 text-xs leading-relaxed">
              Usa las credenciales asignadas a tu perfil administrativo u operativo de PISÁO.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-pisao-cream-muted text-sm">
                  Correo
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
                  Contraseña
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
              variant="outline"
              className="mt-5 w-full"
              disabled={loading}
            >
              {loading ? "Ingresando..." : "Ingresar con email y contraseña"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
