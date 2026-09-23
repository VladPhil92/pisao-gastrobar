ALTER TABLE "pagos"
  ADD COLUMN "comprobanteNombre" VARCHAR(180),
  ADD COLUMN "comprobanteMime" VARCHAR(96),
  ADD COLUMN "comprobanteBytes" BYTEA,
  ADD COLUMN "comprobanteSha256" VARCHAR(64),
  ADD COLUMN "comprobanteRecibidoEn" TIMESTAMP(3);
