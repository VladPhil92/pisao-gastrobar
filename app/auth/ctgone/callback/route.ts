import { NextRequest, NextResponse } from "next/server";

import {
  createCustomerSession,
  CTG_ONE_ORIGIN,
  CTG_ONE_SESSION_COOKIE,
  CTG_ONE_SESSION_MAX_AGE_SECONDS,
  CTG_ONE_TRANSACTION_COOKIE,
  federationCookieOptions,
  federationStateMatches,
  isValidFederationCallback,
  readFederationTransaction,
} from "@/lib/auth/ctgone-federation";

export const dynamic = "force-dynamic";

type ExchangeResponse = {
  provider?: unknown;
  subject?: unknown;
  email?: unknown;
  email_verified?: unknown;
};

function clearTransaction(response: NextResponse) {
  response.cookies.set(CTG_ONE_TRANSACTION_COOKIE, "", federationCookieOptions(0));
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const transaction = readFederationTransaction(request.cookies.get(CTG_ONE_TRANSACTION_COOKIE)?.value);

  if (!transaction || !isValidFederationCallback(code, state) || !federationStateMatches(transaction.state, state!)) {
    const response = NextResponse.redirect(new URL("/?ctgone=federation_invalid", request.url), 302);
    clearTransaction(response);
    return response;
  }

  const secret = process.env.PISAO_FEDERATION_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    const response = NextResponse.redirect(new URL("/?ctgone=federation_unavailable", request.url), 302);
    clearTransaction(response);
    return response;
  }

  let exchange: Response;
  try {
    exchange = await fetch(new URL("/api/federation/pisao/exchange", CTG_ONE_ORIGIN), {
      method: "POST",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        "x-ctg-federation-secret": secret,
      },
      body: JSON.stringify({ code, code_verifier: transaction.verifier }),
    });
  } catch {
    const response = NextResponse.redirect(new URL("/?ctgone=federation_unavailable", request.url), 302);
    clearTransaction(response);
    return response;
  }

  if (!exchange.ok) {
    const response = NextResponse.redirect(new URL("/?ctgone=federation_exchange_failed", request.url), 302);
    clearTransaction(response);
    return response;
  }

  let data: ExchangeResponse;
  try {
    data = (await exchange.json()) as ExchangeResponse;
  } catch {
    const response = NextResponse.redirect(new URL("/?ctgone=federation_exchange_failed", request.url), 302);
    clearTransaction(response);
    return response;
  }

  if (
    data.provider !== "pisao" ||
    typeof data.subject !== "string" ||
    typeof data.email !== "string" ||
    data.email_verified !== true
  ) {
    const response = NextResponse.redirect(new URL("/?ctgone=federation_exchange_failed", request.url), 302);
    clearTransaction(response);
    return response;
  }

  const session = createCustomerSession(data.subject, data.email);
  if (!session) {
    const response = NextResponse.redirect(new URL("/?ctgone=federation_exchange_failed", request.url), 302);
    clearTransaction(response);
    return response;
  }

  const response = NextResponse.redirect(new URL(transaction.next, request.url), 302);
  clearTransaction(response);
  response.cookies.set(
    CTG_ONE_SESSION_COOKIE,
    session,
    federationCookieOptions(CTG_ONE_SESSION_MAX_AGE_SECONDS),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
