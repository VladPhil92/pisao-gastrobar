import { spawn } from "node:child_process";

const isRender = Boolean(process.env.RENDER);
const hasDatabase = Boolean(process.env.DATABASE_URL);

async function runMigration() {
  if (!isRender || !hasDatabase) return;

  console.log("[startup] Running Prisma production migrations on Render.");

  await new Promise((resolve) => {
    const child = spawn("npx", ["prisma", "migrate", "deploy"], {
      stdio: "inherit",
      env: process.env,
    });

    const timeout = setTimeout(() => {
      console.warn(
        "[startup] Prisma migration timed out after 45s. Continuing startup in degraded-safe mode.",
      );
      child.kill("SIGTERM");
    }, 45_000);

    child.on("exit", (code, signal) => {
      clearTimeout(timeout);
      if (signal) {
        console.warn(
          `[startup] Prisma migration stopped by ${signal}. Continuing startup.`,
        );
      } else if (code !== 0) {
        console.warn(
          `[startup] Prisma migration exited with code ${code}. Continuing startup; /api/health?strict=1 must be checked.`,
        );
      } else {
        console.log("[startup] Prisma migrations are up to date.");
      }
      resolve();
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      console.warn(
        `[startup] Could not execute Prisma migration: ${error.message}. Continuing startup.`,
      );
      resolve();
    });
  });
}

await runMigration();
await import("./start-production.mjs");
