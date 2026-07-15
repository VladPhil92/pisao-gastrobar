"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError("Credenciales inválidas");
      return;
    }

    router.push("/admin/dashboard");
  };

  return (
    <div className="bg-pisao-carbon flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="border-pisao-gold/15 bg-pisao-carbon-soft w-full max-w-sm rounded-xl border p-8"
      >
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
        <p className="text-pisao-cream-muted mt-1 text-sm">
          Acceso exclusivo para el equipo administrativo.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-pisao-cream-muted text-sm">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-pisao-gold/20 bg-pisao-carbon text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
            />
          </div>
          <div>
            <label className="text-pisao-cream-muted text-sm">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-pisao-gold/20 bg-pisao-carbon text-pisao-cream focus:border-pisao-gold mt-1 w-full rounded-lg border px-3 py-2 outline-none"
            />
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <Button
          type="submit"
          variant="primary"
          className="mt-6 w-full"
          disabled={loading}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>
    </div>
  );
}
