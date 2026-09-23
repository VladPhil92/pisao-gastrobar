CREATE TABLE "whatsapp_integrations" (
    "id" TEXT NOT NULL,
    "wabaId" VARCHAR(32) NOT NULL,
    "phoneNumberId" VARCHAR(32) NOT NULL,
    "displayPhoneNumber" VARCHAR(32),
    "verifiedName" VARCHAR(128),
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "coexistence" BOOLEAN NOT NULL DEFAULT true,
    "accessTokenCiphertext" TEXT NOT NULL,
    "accessTokenIv" VARCHAR(32) NOT NULL,
    "accessTokenTag" VARCHAR(32) NOT NULL,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_integrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_conversations" (
    "id" TEXT NOT NULL,
    "conversationKey" VARCHAR(96) NOT NULL,
    "customerKey" VARCHAR(64) NOT NULL,
    "integrationId" TEXT,
    "phoneNumberId" VARCHAR(32),
    "humanHandoffUntil" TIMESTAMP(3),
    "lastHumanMessageAt" TIMESTAMP(3),
    "lastInboundAt" TIMESTAMP(3),
    "lastAiMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "whatsapp_webhook_events" (
    "id" TEXT NOT NULL,
    "eventKey" VARCHAR(128) NOT NULL,
    "field" VARCHAR(48) NOT NULL,
    "phoneNumberId" VARCHAR(32),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "whatsapp_webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "whatsapp_integrations_wabaId_key" ON "whatsapp_integrations"("wabaId");
CREATE UNIQUE INDEX "whatsapp_integrations_phoneNumberId_key" ON "whatsapp_integrations"("phoneNumberId");
CREATE INDEX "whatsapp_integrations_status_updatedAt_idx" ON "whatsapp_integrations"("status", "updatedAt");

CREATE UNIQUE INDEX "whatsapp_conversations_conversationKey_key" ON "whatsapp_conversations"("conversationKey");
CREATE INDEX "whatsapp_conversations_customerKey_updatedAt_idx" ON "whatsapp_conversations"("customerKey", "updatedAt");
CREATE INDEX "whatsapp_conversations_integrationId_updatedAt_idx" ON "whatsapp_conversations"("integrationId", "updatedAt");
CREATE INDEX "whatsapp_conversations_humanHandoffUntil_idx" ON "whatsapp_conversations"("humanHandoffUntil");

CREATE UNIQUE INDEX "whatsapp_webhook_events_eventKey_key" ON "whatsapp_webhook_events"("eventKey");
CREATE INDEX "whatsapp_webhook_events_field_receivedAt_idx" ON "whatsapp_webhook_events"("field", "receivedAt");

ALTER TABLE "whatsapp_conversations"
ADD CONSTRAINT "whatsapp_conversations_integrationId_fkey"
FOREIGN KEY ("integrationId") REFERENCES "whatsapp_integrations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
