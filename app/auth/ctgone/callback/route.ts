import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  CTGONE_STATE_COOKIE,
  CTGONE_VERIFIER_COOKIE,
  federationExchangeUrl,
  federationSecret,
  isValidAuthorizationCode,
  isValidState,
  isValidVerifier,
  safeEqual,
} from "@/lib/ctgone/federation";
import {
  createCustomerSessionToken,
  CTGONE_SESSION_COOKIE,
  customerSessionCookieOptions,
} from "@/lib/ctgone/customer-session";

export const dynamic = "force-dynamic";

type ExchangeResponse = {
  provider?: unknown;
  subject?: unknown;
  email?: unknown;
  email_verified?: unknown;
};

function failure(request: Request, reason: string, status = 302) {
  const destination = new URL("/", request.url);
  destination.searchParams.set("ctgone", reason);
  const response = NextResponse.redirect(destination, status);
  response.cookies.delete(CTGONE_STATE_COOKIE);
  response.cookies.delete(CTGONE_VERIFIER_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!isValidAuthorizationCode(code) || !isValidState(state)) {
    return failure(request, "invalid_callback");
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(CTGONE_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(CTGONE_VERIFIER_COOKIE)?.value;
  if (!expectedState || !isValidVerifier(verifier) || !safeEqual(state, expectedState)) {
    return failure(request, "state_mismatch");
  }

  const secret = federationSecret();
  if (!secret) return failure(request, "federation_unavailable");

  let exchange: Response;
  try {
    exchange = await fetch(federationExchangeUrl(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-ctg-federation-secret": secret,
      },
      body: JSON.stringify({ code, code_verifier: verifier }),
      cache: "no-store",
    });
  } catch {
    return failure(request, "exchange_unavailable");
  }

  if (!exchange.ok) return failure(request, "exchange_failed");

  const payload = (await exchange.json()) as ExchangeResponse;
  if (
    payload.provider !== "pisao"
    || typeof payload.subject !== "string"
    || typeof payload.email !== "string"
    || payload.email_verified !== true
  ) {
    return failure(request, "invalid_identity");
  }

  const token = createCustomerSessionToken({
    sub: payload.subject,
    email: payload.email.trim().toLowerCase(),
    emailVerified: true,
  });
  if (!token) return failure(request, "session_unavailable");

  const destination = new URL("/", request.url);
  destination.searchParams.set("ctgone", "connected");
  const response = NextResponse.redirect(destination, 302);
  response.cookies.set(CTGONE_SESSION_COOKIE, token, customerSessionCookieOptions);
  response.cookies.delete(CTGONE_STATE_COOKIE);
  response.cookies.delete(CTGONE_VERIFIER_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
