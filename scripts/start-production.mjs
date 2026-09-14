import { spawn, spawnSync } from "node:child_process";

function run(command, args, label) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });

  if (result.error) {
    console.warn(`[startup] ${label} no pudo ejecutarse: ${result.error.name}`);
    return false;
  }

  if (result.status !== 0) {
    console.warn(
      `[startup] ${label} terminó con código ${result.status}. La web continuará en modo degradado y reintentará en el próximo deploy.`,
    );
    return false;
  }

  return true;
}

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl) {
  const migrated = run("npm", ["run", "db:deploy"], "migración de base de datos");
  if (migrated) {
    run("npm", ["run", "db:seed"], "bootstrap no destructivo de base de datos");
  }
} else {
  console.warn(
    "[startup] DATABASE_URL no está definida. La web inicia sin persistencia; pedidos, reservas y Behavioral Intelligence usarán sus estados de error/fallback.",
  );
}

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
