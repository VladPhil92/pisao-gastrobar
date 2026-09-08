import { NextResponse } from "next/server";

import {
  createFederationState,
  createPkceVerifier,
  CTGONE_STATE_COOKIE,
  CTGONE_VERIFIER_COOKIE,
  federationAuthorizeUrl,
  pkceChallengeForVerifier,
} from "@/lib/ctgone/federation";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = createFederationState();
  const verifier = createPkceVerifier();
  const destination = new URL(federationAuthorizeUrl());
  destination.searchParams.set("state", state);
  destination.searchParams.set("code_challenge", pkceChallengeForVerifier(verifier));

  const response = NextResponse.redirect(destination, 302);
  const transientCookie = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60,
  };
  response.cookies.set(CTGONE_STATE_COOKIE, state, transientCookie);
  response.cookies.set(CTGONE_VERIFIER_COOKIE, verifier, transientCookie);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
