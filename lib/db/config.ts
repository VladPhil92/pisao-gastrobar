function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    if (process.env.CI === "true") {
      return "postgresql://ci:ci@127.0.0.1:1/ci";
    }

    throw new Error(
      "DATABASE_URL is not configured. Production must use the Render PostgreSQL endpoint.",
    );
  }

  try {
    const host = new URL(value).hostname.toLowerCase();
    if (
      process.env.NODE_ENV === "production" &&
      (host === "localhost" || host === "127.0.0.1" || host === "::1")
    ) {
      throw new Error(
        "DATABASE_URL points to localhost in production. Configure the Render PostgreSQL Internal Database URL.",
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("localhost")) {
      throw error;
    }

    throw new Error("DATABASE_URL is not a valid PostgreSQL URL.");
  }

  return value;
}

export function databasePoolConfig() {
  return {
    max: positiveInt(process.env.DB_POOL_MAX, 5),
    idleTimeoutMillis: positiveInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10_000),
    connectionTimeoutMillis: positiveInt(
      process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
      8_000,
    ),
  };
}
