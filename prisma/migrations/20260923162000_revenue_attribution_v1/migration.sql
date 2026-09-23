CREATE TABLE "revenue_attributions" (
  "id" TEXT NOT NULL,
  "pedidoId" TEXT NOT NULL,
  "sessionId" VARCHAR(64) NOT NULL,
  "assists" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lastAssist" VARCHAR(32),
  "touchCount" INTEGER NOT NULL DEFAULT 0,
  "observedFrom" TIMESTAMP(3),
  "observedTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "revenue_attributions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revenue_attributions_pedidoId_key"
  ON "revenue_attributions"("pedidoId");

CREATE INDEX "revenue_attributions_sessionId_createdAt_idx"
  ON "revenue_attributions"("sessionId", "createdAt");

CREATE INDEX "revenue_attributions_lastAssist_createdAt_idx"
  ON "revenue_attributions"("lastAssist", "createdAt");

ALTER TABLE "revenue_attributions"
  ADD CONSTRAINT "revenue_attributions_pedidoId_fkey"
  FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
