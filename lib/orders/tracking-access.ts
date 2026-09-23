import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_PREFIX = "pst_";
const DEFAULT_TTL_DAYS = 90;

export function orderTrackingTokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function validOrderTrackingToken(token: string) {
  return (
    token.startsWith(TOKEN_PREFIX) &&
    token.length >= 40 &&
    token.length <= 96 &&
    /^[A-Za-z0-9_-]+$/.test(token.slice(TOKEN_PREFIX.length))
  );
}

export function orderTrackingTokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return validOrderTrackingToken(token) ? token : null;
}

export async function issueOrderTrackingAccess(pedidoId: string) {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  const tokenHash = orderTrackingTokenHash(token);
  const ttlDays = Math.min(
    365,
    Math.max(7, Number(process.env.ORDER_TRACKING_TTL_DAYS ?? DEFAULT_TTL_DAYS)),
  );
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.pedidoSeguimiento.create({
    data: {
      pedidoId,
      tokenHash,
      expiresAt,
    },
  });

  return {
    token,
    expiresAt,
    url: `/pedidos/seguimiento#token=${encodeURIComponent(token)}`,
  };
}

export async function resolveOrderTrackingAccess(token: string) {
  if (!validOrderTrackingToken(token)) return null;

  const now = new Date();
  const access = await prisma.pedidoSeguimiento.findUnique({
    where: { tokenHash: orderTrackingTokenHash(token) },
    include: {
      pedido: {
        select: {
          numero: true,
          total: true,
          tipoEntrega: true,
          estado: true,
          createdAt: true,
          updatedAt: true,
          pago: {
            select: {
              metodo: true,
              estado: true,
              comprobanteRecibidoEn: true,
              verificadoEn: true,
              criptoMoneda: true,
              txHash: true,
              confirmacionesOnchain: true,
              payloadProveedor: true,
            },
          },
        },
      },
    },
  });

  if (!access || access.revokedAt || access.expiresAt <= now) return null;

  if (
    !access.lastAccessAt ||
    now.getTime() - access.lastAccessAt.getTime() > 5 * 60 * 1000
  ) {
    void prisma.pedidoSeguimiento
      .update({
        where: { id: access.id },
        data: { lastAccessAt: now },
      })
      .catch(() => undefined);
  }

  return access;
}
