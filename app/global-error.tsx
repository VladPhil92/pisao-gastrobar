"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void fetch("/api/observability/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: error.name,
        message: error.message,
        stack: error.stack,
        pathname: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-pisao-carbon text-pisao-cream flex min-h-screen items-center justify-center px-6">
        <main className="border-pisao-gold/20 bg-pisao-noche max-w-lg rounded-3xl border p-8 text-center">
          <p className="text-pisao-gold text-xs font-bold tracking-[0.2em] uppercase">
            PISÁO
          </p>
          <h1 className="font-display mt-3 text-3xl">
            Algo no salió como esperábamos.
          </h1>
          <p className="text-pisao-cream-muted mt-3 text-sm leading-relaxed">
            El incidente quedó registrado de forma técnica. Puedes intentar cargar
            nuevamente la experiencia.
          </p>
          <button
            type="button"
            onClick={reset}
            className="bg-pisao-gold text-pisao-carbon mt-6 rounded-xl px-5 py-3 text-sm font-bold"
          >
            Intentar nuevamente
          </button>
        </main>
      </body>
    </html>
  );
}
