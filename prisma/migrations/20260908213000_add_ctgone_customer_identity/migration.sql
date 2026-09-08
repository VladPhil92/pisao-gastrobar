-- Optional CTG One identity linkage for guest-compatible commerce.
ALTER TABLE "pedidos" ADD COLUMN "ctgOneSubject" TEXT;
ALTER TABLE "reservas" ADD COLUMN "ctgOneSubject" TEXT;

CREATE INDEX "pedidos_ctgOneSubject_idx" ON "pedidos"("ctgOneSubject");
CREATE INDEX "reservas_ctgOneSubject_idx" ON "reservas"("ctgOneSubject");
