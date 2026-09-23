import { timingSafeEqual } from "node:crypto";

const DEFAULT_CANONICAL_HOSTS = [
  "pisaogastrobar.com",
  "www.pisaogastrobar.com",
];

function configuredCanonicalHosts() {
  const configured = (process.env.PISAO_CANONICAL_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return configured.length ? configured : DEFAULT_CANONICAL_HOSTS;
}

export function canonicalOriginEnforced() {
  return process.env.PISAO_ENFORCE_CANONICAL_HOST === "true";
}

export function edgeSecretRequired() {
  return process.env.PISAO_REQUIRE_EDGE_SECRET === "true";
}

function secureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function edgeOriginHealth() {
  return {
    canonicalHostEnforcement: canonicalOriginEnforced()
      ? "enabled"
      : "disabled",
    canonicalHosts: configuredCanonicalHosts(),
    edgeSecret: edgeSecretRequired()
      ? process.env.PISAO_EDGE_SECRET
        ? "required"
        : "misconfigured"
      : "disabled",
  };
}

export function validateCanonicalWriteOrigin(request: Request) {
  if (!canonicalOriginEnforced()) {
    return { ok: true as const, mode: "disabled" as const };
  }

  let requestHost = "";
  try {
    requestHost = new URL(request.url).hostname.toLowerCase();
  } catch {
    return { ok: false as const, code: "INVALID_REQUEST_HOST" as const };
  }

  const allowed = configuredCanonicalHosts();
  if (!allowed.includes(requestHost)) {
    return {
      ok: false as const,
      code: "NON_CANONICAL_ORIGIN" as const,
    };
  }

  if (edgeSecretRequired()) {
    const expected = process.env.PISAO_EDGE_SECRET?.trim();
    const received = request.headers.get("x-pisao-edge-secret")?.trim();

    if (!expected || expected.length < 32) {
      return {
        ok: false as const,
        code: "EDGE_SECRET_MISCONFIGURED" as const,
      };
    }

    if (!received || !secureEqual(received, expected)) {
      return {
        ok: false as const,
        code: "EDGE_SECRET_REQUIRED" as const,
      };
    }
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originHost = new URL(origin).hostname.toLowerCase();
      if (!allowed.includes(originHost)) {
        return {
          ok: false as const,
          code: "CROSS_ORIGIN_WRITE_REJECTED" as const,
        };
      }
    } catch {
      return {
        ok: false as const,
        code: "INVALID_ORIGIN_HEADER" as const,
      };
    }
  }

  return { ok: true as const, mode: "enforced" as const };
}
