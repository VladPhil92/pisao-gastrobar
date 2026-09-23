-- PISÁO Concierge V4: stateful commerce tool session

ALTER TABLE "ai_conversation_sessions"
ADD COLUMN "lastTool" VARCHAR(48),
ADD COLUMN "commerceState" JSONB;
