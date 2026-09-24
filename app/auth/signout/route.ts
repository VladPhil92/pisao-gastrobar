import { NextRequest, NextResponse } from "next/server";

import {
  CUSTOMER_SESSION_COOKIE,
  customerCookieOptions,
} from "@/lib/auth/customer-session";
import {
  CTG_ONE_SESSION_COOKIE,
  federationCookieOptions,
} from "@/lib/auth/ctgone-federation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/micuenta", request.url), 302);
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", customerCookieOptions(0));
  response.cookies.set(CTG_ONE_SESSION_COOKIE, "", federationCookieOptions(0));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
