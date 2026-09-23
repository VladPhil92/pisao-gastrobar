import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, requestIdentity } from "./rate-limit";

test("prioriza CF-Connecting-IP solo cuando el proxy Cloudflare es confiable", () => {
  const previous = process.env.CLOUDFLARE_TRUST_PROXY;
  process.env.CLOUDFLARE_TRUST_PROXY = "true";

  try {
    const request = new Request("https://pisaogastrobar.com/api/health", {
      headers: {
        "cf-connecting-ip": "203.0.113.20",
        "x-forwarded-for": "198.51.100.10, 10.0.0.1",
        "x-real-ip": "192.0.2.1",
      },
    });

    assert.equal(requestIdentity(request), "203.0.113.20");
  } finally {
    if (previous === undefined) delete process.env.CLOUDFLARE_TRUST_PROXY;
    else process.env.CLOUDFLARE_TRUST_PROXY = previous;
  }
});

test("ignora un CF-Connecting-IP falsificable y prefiere X-Real-IP si el proxy no está confiado", () => {
  const previous = process.env.CLOUDFLARE_TRUST_PROXY;
  delete process.env.CLOUDFLARE_TRUST_PROXY;

  try {
    const request = new Request("https://pisaogastrobar.com/api/health", {
      headers: {
        "cf-connecting-ip": "203.0.113.20",
        "x-forwarded-for": "198.51.100.10, 10.0.0.1",
        "x-real-ip": "192.0.2.1",
      },
    });

    assert.equal(requestIdentity(request), "192.0.2.1");
  } finally {
    if (previous !== undefined) process.env.CLOUDFLARE_TRUST_PROXY = previous;
  }
});

test("usa el salto más cercano del X-Forwarded-For cuando no existe X-Real-IP", () => {
  const request = new Request("https://pisaogastrobar.com/api/health", {
    headers: {
      "x-forwarded-for": "198.51.100.10, 10.0.0.1",
    },
  });

  assert.equal(requestIdentity(request), "10.0.0.1");
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
