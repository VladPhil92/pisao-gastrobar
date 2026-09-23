-- PISÁO Concierge V6: transaction command bus

CREATE TABLE "ai_transaction_commands" (
  "id" TEXT NOT NULL,
  "sessionKey" VARCHAR(96) NOT NULL,
  "type" VARCHAR(48) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  "tokenHash" VARCHAR(64) NOT NULL,
  "idempotencyKey" VARCHAR(64) NOT NULL,
  "payload" JSONB NOT NULL,
  "containsPii" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "failureCode" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_transaction_commands_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_transaction_commands_idempotencyKey_key"
ON "ai_transaction_commands"("idempotencyKey");

CREATE INDEX "ai_transaction_commands_sessionKey_status_createdAt_idx"
ON "ai_transaction_commands"("sessionKey", "status", "createdAt");

CREATE INDEX "ai_transaction_commands_expiresAt_idx"
ON "ai_transaction_commands"("expiresAt");
