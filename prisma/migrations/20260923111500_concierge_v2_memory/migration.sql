-- PISÁO Concierge V2: persistent anonymous hospitality memory and run telemetry

CREATE TABLE "ai_guest_profiles" (
    "id" TEXT NOT NULL,
    "guestKey" VARCHAR(96) NOT NULL,
    "interactionCount" INTEGER NOT NULL DEFAULT 0,
    "conversationStyle" VARCHAR(24),
    "preferredFoodSignals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "preferredDrinkSignals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "lastIntent" VARCHAR(32),
    "lastGuestState" VARCHAR(32),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_guest_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_conversation_sessions" (
    "id" TEXT NOT NULL,
    "sessionKey" VARCHAR(96) NOT NULL,
    "guestProfileId" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastAgent" VARCHAR(32),
    "lastIntent" VARCHAR(32),
    "lastOutcome" VARCHAR(48),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_conversation_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_concierge_runs" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "guestProfileId" TEXT,
    "model" VARCHAR(64) NOT NULL,
    "agent" VARCHAR(32) NOT NULL,
    "intent" VARCHAR(32) NOT NULL,
    "outcome" VARCHAR(48) NOT NULL,
    "fallback" BOOLEAN NOT NULL DEFAULT false,
    "latencyMs" INTEGER NOT NULL,
    "reservationIntent" BOOLEAN NOT NULL DEFAULT false,
    "proposalCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_concierge_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_guest_profiles_guestKey_key" ON "ai_guest_profiles"("guestKey");
CREATE INDEX "ai_guest_profiles_lastSeenAt_idx" ON "ai_guest_profiles"("lastSeenAt");
CREATE UNIQUE INDEX "ai_conversation_sessions_sessionKey_key" ON "ai_conversation_sessions"("sessionKey");
CREATE INDEX "ai_conversation_sessions_guestProfileId_lastSeenAt_idx" ON "ai_conversation_sessions"("guestProfileId", "lastSeenAt");
CREATE INDEX "ai_concierge_runs_createdAt_idx" ON "ai_concierge_runs"("createdAt");
CREATE INDEX "ai_concierge_runs_agent_createdAt_idx" ON "ai_concierge_runs"("agent", "createdAt");
CREATE INDEX "ai_concierge_runs_sessionId_createdAt_idx" ON "ai_concierge_runs"("sessionId", "createdAt");

ALTER TABLE "ai_conversation_sessions"
ADD CONSTRAINT "ai_conversation_sessions_guestProfileId_fkey"
FOREIGN KEY ("guestProfileId") REFERENCES "ai_guest_profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_concierge_runs"
ADD CONSTRAINT "ai_concierge_runs_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "ai_conversation_sessions"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_concierge_runs"
ADD CONSTRAINT "ai_concierge_runs_guestProfileId_fkey"
FOREIGN KEY ("guestProfileId") REFERENCES "ai_guest_profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
