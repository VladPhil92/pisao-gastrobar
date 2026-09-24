import { NextRequest, NextResponse } from "next/server";

import {
  createFederationTransaction,
  CTG_ONE_ORIGIN,
  CTG_ONE_TRANSACTION_COOKIE,
  CTG_ONE_TRANSACTION_MAX_AGE_SECONDS,
  federationCookieOptions,
  normalizeFederationNext,
  pisaoPublicUrl,
} from "@/lib/auth/ctgone-federation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const next = normalizeFederationNext(request.nextUrl.searchParams.get("next"));
  const transaction = createFederationTransaction(next);
  if (!transaction) {
    const adminDestination = next === "/admin" || next.startsWith("/admin/");
    if (adminDestination) {
      return NextResponse.redirect(
        pisaoPublicUrl("/admin/login?ctgone=federation_unavailable"),
        302,
      );
    }
    return NextResponse.json(
      { error: "CTG_ONE_FEDERATION_NOT_CONFIGURED" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const authorizeUrl = new URL("/api/federation/pisao/authorize", CTG_ONE_ORIGIN);
  authorizeUrl.searchParams.set("code_challenge", transaction.challenge);
  authorizeUrl.searchParams.set("state", transaction.state);

  const response = NextResponse.redirect(authorizeUrl, 302);
  response.cookies.set(
    CTG_ONE_TRANSACTION_COOKIE,
    transaction.cookieValue,
    federationCookieOptions(CTG_ONE_TRANSACTION_MAX_AGE_SECONDS),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
