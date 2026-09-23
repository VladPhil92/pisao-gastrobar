ALTER TABLE "productos"
  ADD COLUMN "inventarioBajoReceta" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "pedidos"
  ADD COLUMN "entregadoAt" TIMESTAMP(3);

UPDATE "pedidos"
SET "entregadoAt" = "updatedAt"
WHERE "estado" = 'ENTREGADO' AND "entregadoAt" IS NULL;

CREATE INDEX "pedidos_estado_entregadoAt_idx"
  ON "pedidos"("estado", "entregadoAt");

CREATE TYPE "UnidadInsumo" AS ENUM ('GRAMO', 'MILILITRO', 'UNIDAD');
CREATE TYPE "TipoMovimientoInventario" AS ENUM ('CONTEO', 'ENTRADA', 'SALIDA', 'MERMA', 'AJUSTE');

CREATE TABLE "inventario_insumos" (
  "id" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "unidadBase" "UnidadInsumo" NOT NULL,
  "stockActual" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "stockMinimo" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "costoUnidadBase" DECIMAL(14,4),
  "costoCompraReferencia" DECIMAL(12,2),
  "cantidadCompraReferencia" DECIMAL(14,3),
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "ultimaRevisionAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inventario_insumos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recetas_insumos" (
  "id" TEXT NOT NULL,
  "productoId" TEXT NOT NULL,
  "insumoId" TEXT NOT NULL,
  "cantidadBase" DECIMAL(14,3) NOT NULL,
  "mermaPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recetas_insumos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "movimientos_inventario" (
  "id" TEXT NOT NULL,
  "insumoId" TEXT NOT NULL,
  "tipo" "TipoMovimientoInventario" NOT NULL,
  "delta" DECIMAL(14,3) NOT NULL,
  "stockAnterior" DECIMAL(14,3) NOT NULL,
  "stockPosterior" DECIMAL(14,3) NOT NULL,
  "motivo" VARCHAR(180),
  "usuarioId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "movimientos_inventario_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inventario_insumos_nombre_key" ON "inventario_insumos"("nombre");
CREATE INDEX "inventario_insumos_activo_nombre_idx" ON "inventario_insumos"("activo", "nombre");
CREATE UNIQUE INDEX "recetas_insumos_productoId_insumoId_key" ON "recetas_insumos"("productoId", "insumoId");
CREATE INDEX "recetas_insumos_insumoId_productoId_idx" ON "recetas_insumos"("insumoId", "productoId");
CREATE INDEX "movimientos_inventario_insumoId_createdAt_idx" ON "movimientos_inventario"("insumoId", "createdAt");
CREATE INDEX "movimientos_inventario_tipo_createdAt_idx" ON "movimientos_inventario"("tipo", "createdAt");

ALTER TABLE "recetas_insumos"
  ADD CONSTRAINT "recetas_insumos_productoId_fkey"
  FOREIGN KEY ("productoId") REFERENCES "productos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recetas_insumos"
  ADD CONSTRAINT "recetas_insumos_insumoId_fkey"
  FOREIGN KEY ("insumoId") REFERENCES "inventario_insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "movimientos_inventario"
  ADD CONSTRAINT "movimientos_inventario_insumoId_fkey"
  FOREIGN KEY ("insumoId") REFERENCES "inventario_insumos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "movimientos_inventario"
  ADD CONSTRAINT "movimientos_inventario_usuarioId_fkey"
  FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
