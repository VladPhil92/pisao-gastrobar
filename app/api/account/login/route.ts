import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import {
  createCustomerLocalSession,
  CUSTOMER_SESSION_COOKIE,
  customerCookieOptions,
} from "@/lib/auth/customer-session";
import { resolveCrmCustomerProfile } from "@/lib/crm/customer-identity";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  const cliente = await prisma.cliente.findUnique({ where: { email } });
  if (!cliente || !cliente.activo || !(await bcrypt.compare(password, cliente.passwordHash))) {
    return NextResponse.json({ error: "INVALID_CREDENTIALS" }, { status: 401 });
  }

  await prisma.cliente.update({
    where: { id: cliente.id },
    data: { lastLoginAt: new Date() },
  });

  await resolveCrmCustomerProfile({
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: cliente.telefono,
    source: "ACCOUNT",
    accountClienteId: cliente.id,
  });

  const token = createCustomerLocalSession({
    id: cliente.id,
    email: cliente.email,
    name: cliente.nombre,
  });
  if (!token) {
    return NextResponse.json({ error: "SESSION_NOT_CONFIGURED" }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, token, customerCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
