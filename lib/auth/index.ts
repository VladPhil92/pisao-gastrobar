import NextAuth, { type Session } from "next-auth";
import { cookies } from "next/headers";
import { authConfig } from "./config";
import {
  CTG_ONE_ADMIN_SESSION_COOKIE,
  readAdminSession,
} from "./ctgone-federation";

const nextAuth = NextAuth(authConfig);

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

function federatedSession(
  federated: NonNullable<ReturnType<typeof readAdminSession>>,
): Session {
  const session: Session = {
    user: {
      name: "CTG One Admin",
      email: federated.email,
      image: null,
    },
    expires: new Date(federated.exp).toISOString(),
  };

  (session.user as { id?: string; rol?: string; authSource?: string }).id =
    federated.localUserId;
  (session.user as { id?: string; rol?: string; authSource?: string }).rol =
    federated.rol;
  (
    session.user as { id?: string; rol?: string; authSource?: string }
  ).authSource = "ctgone";

  return session;
}

export async function auth(): Promise<Session | null> {
  // Federated ADMIN authority intentionally wins over any stale local
  // CAJERO/COCINA session that may still exist in the same browser.
  const cookieStore = await cookies();
  const federated = readAdminSession(
    cookieStore.get(CTG_ONE_ADMIN_SESSION_COOKIE)?.value,
  );
  if (federated) return federatedSession(federated);

  return nextAuth.auth();
}
