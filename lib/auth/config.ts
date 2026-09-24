import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * Configuración de NextAuth (Auth.js v5) para el panel administrativo.
 * Solo staff (Usuario en Prisma) puede autenticarse aquí; los clientes
 * finales nunca crean cuenta.
 */
export const authConfig: NextAuthConfig = {
  // PISÁO se ejecuta en producción detrás del proxy administrado de Render.
  // Auth.js necesita confiar en el host reenviado para construir correctamente
  // las URLs internas de sesión en producción. No amplía quién puede iniciar sesión:
  // el acceso sigue limitado al proveedor Credentials y a Usuario activo en Prisma.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/admin/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const normalizedEmail = email.trim().toLowerCase();
        const usuario = await prisma.usuario.findUnique({
          where: { email: normalizedEmail },
        });
        if (!usuario || !usuario.activo) return null;

        const valido = await bcrypt.compare(password, usuario.passwordHash);
        if (!valido) return null;

        await prisma.usuario.update({
          where: { id: usuario.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          sessionVersion: usuario.sessionVersion,
          authSource: "local",
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        const typed = user as {
          rol?: string;
          sessionVersion?: number;
          authSource?: string;
        };
        token.rol = typed.rol;
        token.sessionVersion = typed.sessionVersion;
        token.authSource = typed.authSource ?? "local";
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        const user = session.user as {
          id?: string;
          rol?: string;
          sessionVersion?: number;
          authSource?: string;
        };
        user.rol = token.rol as string;
        user.id = token.sub;
        user.sessionVersion =
          typeof token.sessionVersion === "number"
            ? token.sessionVersion
            : undefined;
        user.authSource =
          typeof token.authSource === "string"
            ? token.authSource
            : "local";
      }
      return session;
    },
  },
};
