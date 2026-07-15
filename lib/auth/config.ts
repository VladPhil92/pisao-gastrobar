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

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        if (!usuario || !usuario.activo) return null;

        const valido = await bcrypt.compare(password, usuario.passwordHash);
        if (!valido) return null;

        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
        };
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.rol = (user as { rol?: string }).rol;
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        (session.user as { rol?: string }).rol = token.rol as string;
        (session.user as { id?: string }).id = token.sub;
      }
      return session;
    },
  },
};
