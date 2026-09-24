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

export async function auth(): Promise<Session | null> {
  const localSession = await nextAuth.auth();
  if (localSession?.user) return localSession;

  const cookieStore = await cookies();
  const federated = readAdminSession(
    cookieStore.get(CTG_ONE_ADMIN_SESSION_COOKIE)?.value,
  );
  if (!federated) return null;

  const session: Session = {
    user: {
      name: "CTG One Admin",
      email: federated.email,
      image: null,
    },
    expires: new Date(federated.exp).toISOString(),
  };

  (session.user as { id?: string; rol?: string; authSource?: string }).id =
    federated.sub;
  (session.user as { id?: string; rol?: string; authSource?: string }).rol =
    federated.rol;
  (
    session.user as { id?: string; rol?: string; authSource?: string }
  ).authSource = "ctgone";

  return session;
}
