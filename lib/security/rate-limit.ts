type Bucket = {
  count: number;
  resetAt: number;
};

const globalRateLimit = globalThis as unknown as {
  pisaoRateLimit?: Map<string, Bucket>;
};

const buckets = globalRateLimit.pisaoRateLimit ?? new Map<string, Bucket>();

if (process.env.NODE_ENV !== "production") {
  globalRateLimit.pisaoRateLimit = buckets;
}

function cleanup(now: number) {
  if (buckets.size < 2000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function requestIdentity(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  return ip || request.headers.get("x-real-ip") || "unknown";
}

export function checkRateLimit(params: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  cleanup(now);

  const current = buckets.get(params.key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + params.windowMs };
    buckets.set(params.key, next);
    return {
      allowed: true,
      remaining: Math.max(0, params.limit - 1),
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= params.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  buckets.set(params.key, current);

  return {
    allowed: true,
    remaining: Math.max(0, params.limit - current.count),
    retryAfterSeconds: 0,
  };
}
