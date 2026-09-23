ALTER TABLE "productos"
  ADD COLUMN "costoUnitario" DECIMAL(10,2),
  ADD COLUMN "inventarioBajo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "costoActualizadoAt" TIMESTAMP(3);

ALTER TABLE "items_pedido"
  ADD COLUMN "costoUnitarioSnapshot" DECIMAL(10,2);

CREATE INDEX "productos_disponible_inventarioBajo_idx"
  ON "productos"("disponible", "inventarioBajo");

ALTER TABLE "revenue_policies"
  ADD COLUMN "operationalPauseReason" VARCHAR(180);
