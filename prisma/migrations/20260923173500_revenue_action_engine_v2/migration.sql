CREATE TABLE "revenue_actions" (
  "id" TEXT NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "engineVersion" VARCHAR(48) NOT NULL DEFAULT 'revenue_action_engine_v2',
  "type" VARCHAR(48) NOT NULL,
  "status" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  "riskLevel" VARCHAR(16) NOT NULL,
  "executionMode" VARCHAR(24) NOT NULL,
  "priorityScore" INTEGER NOT NULL DEFAULT 50,
  "title" VARCHAR(180) NOT NULL,
  "rationale" TEXT NOT NULL,
  "recommendedAction" TEXT NOT NULL,
  "objectiveMetric" VARCHAR(96) NOT NULL,
  "evidence" JSONB NOT NULL,
  "payload" JSONB,
  "decidedById" TEXT,
  "executedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "measurementStartedAt" TIMESTAMP(3),
  "measurementWindowDays" INTEGER NOT NULL DEFAULT 7,
  "measuredAt" TIMESTAMP(3),
  "outcome" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "revenue_actions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revenue_actions_fingerprint_key"
  ON "revenue_actions"("fingerprint");

CREATE INDEX "revenue_actions_status_priorityScore_createdAt_idx"
  ON "revenue_actions"("status", "priorityScore", "createdAt");

CREATE INDEX "revenue_actions_type_createdAt_idx"
  ON "revenue_actions"("type", "createdAt");

ALTER TABLE "revenue_actions"
  ADD CONSTRAINT "revenue_actions_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_actions"
  ADD CONSTRAINT "revenue_actions_executedById_fkey"
  FOREIGN KEY ("executedById") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
