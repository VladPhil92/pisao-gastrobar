-- V12 — Private customer order tracking
CREATE TABLE "pedidos_seguimiento" (
  "id" TEXT NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "pedidoId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastAccessAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pedidos_seguimiento_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pedidos_seguimiento_tokenHash_key"
  ON "pedidos_seguimiento"("tokenHash");

CREATE INDEX "pedidos_seguimiento_pedidoId_createdAt_idx"
  ON "pedidos_seguimiento"("pedidoId", "createdAt");

CREATE INDEX "pedidos_seguimiento_expiresAt_idx"
  ON "pedidos_seguimiento"("expiresAt");

ALTER TABLE "pedidos_seguimiento"
  ADD CONSTRAINT "pedidos_seguimiento_pedidoId_fkey"
  FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
