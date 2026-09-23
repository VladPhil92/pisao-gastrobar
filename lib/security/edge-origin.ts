import "server-only";

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

export function edgeOriginHealth() {
  return {
    canonicalHostEnforcement: canonicalOriginEnforced()
      ? "enabled"
      : "disabled",
    canonicalHosts: configuredCanonicalHosts(),
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
