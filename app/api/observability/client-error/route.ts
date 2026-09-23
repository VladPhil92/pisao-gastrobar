import { NextResponse } from "next/server";
import { checkRateLimit, requestIdentity } from "@/lib/security/rate-limit";
import { captureServerError } from "@/lib/observability/sentry-transport";
import { validateCanonicalWriteOrigin } from "@/lib/security/edge-origin";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const edgeOrigin = validateCanonicalWriteOrigin(request);
  if (!edgeOrigin.ok) {
    return Response.json(
      { error: "Origen de solicitud no permitido.", code: edgeOrigin.code },
      { status: 403 },
    );
  }

  const identity = requestIdentity(request);
  const rate = checkRateLimit({
    key: `client-error:${identity}`,
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { accepted: false },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: unknown;
      message?: unknown;
      stack?: unknown;
      pathname?: unknown;
    };

    const name = clean(body.name, 120) || "ClientError";
    const message = clean(body.message, 800) || "Unknown client error";
    const stack = clean(body.stack, 6_000);
    const pathname = clean(body.pathname, 240).split("?")[0] || "unknown";

    const error = new Error(message);
    error.name = name;
    if (stack) error.stack = stack;

    void captureServerError(error, {
      surface: "browser",
      pathname,
    });

    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }
}
