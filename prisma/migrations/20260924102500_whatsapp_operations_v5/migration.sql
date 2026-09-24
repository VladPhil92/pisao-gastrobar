ALTER TABLE "whatsapp_meta_config"
  ADD COLUMN "lastAutoPauseAt" TIMESTAMP(3),
  ADD COLUMN "lastAutoPauseReason" VARCHAR(96);

ALTER TABLE "whatsapp_webhook_events"
  ADD COLUMN "status" VARCHAR(24) NOT NULL DEFAULT 'RECEIVED',
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "failureCode" VARCHAR(64),
  ADD COLUMN "failedAt" TIMESTAMP(3);

UPDATE "whatsapp_webhook_events"
SET "status" = CASE
  WHEN "processedAt" IS NOT NULL THEN 'PROCESSED'
  ELSE 'RECEIVED'
END;

CREATE INDEX "whatsapp_webhook_events_status_receivedAt_idx"
  ON "whatsapp_webhook_events"("status", "receivedAt");
