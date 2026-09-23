import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, requestIdentity } from "./rate-limit";

test("prioriza CF-Connecting-IP sobre forwarded headers", () => {
  const request = new Request("https://pisaogastrobar.com/api/health", {
    headers: {
      "cf-connecting-ip": "203.0.113.20",
      "x-forwarded-for": "198.51.100.10, 10.0.0.1",
      "x-real-ip": "192.0.2.1",
    },
  });

  assert.equal(requestIdentity(request), "203.0.113.20");
});

test("usa el primer X-Forwarded-For cuando Cloudflare no está presente", () => {
  const request = new Request("https://pisaogastrobar.com/api/health", {
    headers: {
      "x-forwarded-for": "198.51.100.10, 10.0.0.1",
      "x-real-ip": "192.0.2.1",
    },
  });

  assert.equal(requestIdentity(request), "198.51.100.10");
});

test("rate limiter bloquea al superar el límite del bucket", () => {
  const key = `test-${crypto.randomUUID()}`;
  assert.equal(
    checkRateLimit({ key, limit: 2, windowMs: 60_000 }).allowed,
    true,
  );
  assert.equal(
    checkRateLimit({ key, limit: 2, windowMs: 60_000 }).allowed,
    true,
  );
  const blocked = checkRateLimit({ key, limit: 2, windowMs: 60_000 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
});
