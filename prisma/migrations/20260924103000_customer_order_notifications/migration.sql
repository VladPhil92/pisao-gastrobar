-- Payment Customer Lifecycle V4
CREATE TABLE "customer_order_notifications" (
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
  "pedidoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customer_order_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_order_notifications_eventKey_key"
  ON "customer_order_notifications"("eventKey");
CREATE INDEX "customer_order_notifications_status_nextAttemptAt_idx"
  ON "customer_order_notifications"("status", "nextAttemptAt");
CREATE INDEX "customer_order_notifications_pedidoId_createdAt_idx"
  ON "customer_order_notifications"("pedidoId", "createdAt");

ALTER TABLE "customer_order_notifications"
  ADD CONSTRAINT "customer_order_notifications_pedidoId_fkey"
  FOREIGN KEY ("pedidoId") REFERENCES "pedidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
