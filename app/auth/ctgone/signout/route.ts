import { NextRequest, NextResponse } from "next/server";

import {
  CTG_ONE_SESSION_COOKIE,
  federationCookieOptions,
} from "@/lib/auth/ctgone-federation";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url), 302);
  response.cookies.set(CTG_ONE_SESSION_COOKIE, "", federationCookieOptions(0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
