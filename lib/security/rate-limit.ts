type Bucket = {
  count: number;
  resetAt: number;
};

const globalRateLimit = globalThis as unknown as {
  pisaoRateLimit?: Map<string, Bucket>;
};

const buckets = globalRateLimit.pisaoRateLimit ?? new Map<string, Bucket>();

// Preserve buckets across module reloads and route bundles in a single
// Render instance. Edge enforcement remains the primary distributed layer.
globalRateLimit.pisaoRateLimit = buckets;

function cleanup(now: number) {
  if (buckets.size < 2000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function cloudflareProxyTrusted() {
  return process.env.CLOUDFLARE_TRUST_PROXY === "true";
}

export function requestIdentity(request: Request) {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareProxyTrusted() && cloudflareIp) return cloudflareIp;

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  // Outside an explicitly trusted Cloudflare path, prefer the proxy-nearest
  // hop instead of the client-controlled leftmost value.
  const proxyNearestIp = forwarded?.at(-1);

  return proxyNearestIp || "unknown";
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
