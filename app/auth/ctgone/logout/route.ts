import { NextResponse } from "next/server";

import { CTGONE_SESSION_COOKIE } from "@/lib/ctgone/customer-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url), 302);
  response.cookies.delete(CTGONE_SESSION_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
