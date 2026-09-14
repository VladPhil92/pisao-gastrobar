-- CreateTable
CREATE TABLE "eventos_analiticos" (
    "id" TEXT NOT NULL,
    "tipo" VARCHAR(48) NOT NULL,
    "sessionId" VARCHAR(64) NOT NULL,
    "pathname" VARCHAR(180) NOT NULL,
    "surface" VARCHAR(48),
    "productSlug" VARCHAR(96),
    "categorySlug" VARCHAR(96),
    "intent" VARCHAR(32),
    "step" VARCHAR(48),
    "paymentMethod" VARCHAR(32),
    "deviceClass" VARCHAR(16),
    "budgetTier" INTEGER,
    "diners" INTEGER,
    "itemCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_analiticos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_analiticos_createdAt_idx" ON "eventos_analiticos"("createdAt");

-- CreateIndex
CREATE INDEX "eventos_analiticos_tipo_createdAt_idx" ON "eventos_analiticos"("tipo", "createdAt");

-- CreateIndex
CREATE INDEX "eventos_analiticos_sessionId_createdAt_idx" ON "eventos_analiticos"("sessionId", "createdAt");
