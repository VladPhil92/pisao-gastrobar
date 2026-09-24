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

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const telefono = typeof body.telefono === "string" ? body.telefono.trim() : "";

  if (nombre.length < 2 || nombre.length > 100 || !email.includes("@") || password.length < 8) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const existing = await prisma.cliente.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "EMAIL_ALREADY_REGISTERED" }, { status: 409 });
  }

  const cliente = await prisma.cliente.create({
    data: {
      nombre,
      email,
      telefono: telefono || null,
      passwordHash: await bcrypt.hash(password, 12),
      lastLoginAt: new Date(),
    },
    select: { id: true, nombre: true, email: true },
  });

  await resolveCrmCustomerProfile({
    nombre: cliente.nombre,
    email: cliente.email,
    telefono: telefono || null,
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
