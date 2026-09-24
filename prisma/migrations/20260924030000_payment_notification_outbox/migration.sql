-- Payment Operations Reliability V2
CREATE TABLE "payment_admin_notifications" (
  "id" TEXT NOT NULL,
  "eventKey" VARCHAR(180) NOT NULL,
  "event" VARCHAR(64) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  "provider" VARCHAR(32),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" VARCHAR(180),
  "lastAttemptAt" TIMESTAMP(3),
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMP(3),
  "proofSha256" VARCHAR(64),
  "pedidoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_admin_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_admin_notifications_eventKey_key"
  ON "payment_admin_notifications"("eventKey");
CREATE INDEX "payment_admin_notifications_status_nextAttemptAt_idx"
  ON "payment_admin_notifications"("status", "nextAttemptAt");
CREATE INDEX "payment_admin_notifications_pedidoId_createdAt_idx"
  ON "payment_admin_notifications"("pedidoId", "createdAt");

ALTER TABLE "payment_admin_notifications"
  ADD CONSTRAINT "payment_admin_notifications_pedidoId_fkey"
  FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
