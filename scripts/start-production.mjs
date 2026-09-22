import { spawn } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[startup] DATABASE_URL no está definida. La web iniciará, pero reservas, pedidos y panel administrativo operarán en modo degradado.",
  );
}

// Las migraciones se ejecutan en el pre-deploy de Render. El proceso de runtime
// debe iniciar Next.js inmediatamente y no bloquear cada cold start contra Postgres.
const child = spawn("node", [".next/standalone/server.js"], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: "0.0.0.0",
  },
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`[startup] No fue posible iniciar Next.js: ${error.message}`);
  process.exit(1);
});
