import { NextRequest, NextResponse } from "next/server";

import {
  CTG_ONE_ADMIN_SESSION_COOKIE,
  CTG_ONE_SESSION_COOKIE,
  federationCookieOptions,
  normalizeFederationNext,
  pisaoPublicUrl,
} from "@/lib/auth/ctgone-federation";

export async function GET(request: NextRequest) {
  const next = normalizeFederationNext(request.nextUrl.searchParams.get("next"));
  const response = NextResponse.redirect(pisaoPublicUrl(next), 302);
  response.cookies.set(CTG_ONE_SESSION_COOKIE, "", federationCookieOptions(0));
  response.cookies.set(
    CTG_ONE_ADMIN_SESSION_COOKIE,
    "",
    federationCookieOptions(0),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
