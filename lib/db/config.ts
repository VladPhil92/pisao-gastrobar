function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      "DATABASE_URL is not configured. Production must use an external PostgreSQL endpoint; localhost fallback is disabled.",
    );
  }

  return value;
}

export function databasePoolConfig() {
  return {
    max: positiveInt(process.env.DB_POOL_MAX, 1),
    idleTimeoutMillis: positiveInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 10_000),
    connectionTimeoutMillis: positiveInt(
      process.env.DB_POOL_CONNECTION_TIMEOUT_MS,
      8_000,
    ),
  };
}
