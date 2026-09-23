CREATE TABLE "revenue_experiments" (
  "id" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "actionId" TEXT NOT NULL,
  "status" VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  "surface" VARCHAR(32) NOT NULL DEFAULT 'CONCIERGE',
  "primaryMetric" VARCHAR(64) NOT NULL DEFAULT 'paid_conversion_rate',
  "treatmentPct" INTEGER NOT NULL DEFAULT 50,
  "minAssignmentsPerArm" INTEGER NOT NULL DEFAULT 30,
  "startedById" TEXT,
  "endedById" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "measuredAt" TIMESTAMP(3),
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "revenue_experiments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "revenue_experiment_assignments" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "sessionId" VARCHAR(64) NOT NULL,
  "arm" VARCHAR(16) NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "eligibleAt" TIMESTAMP(3),
  "eligibilityCount" INTEGER NOT NULL DEFAULT 0,
  "exposedAt" TIMESTAMP(3),
  "exposureCount" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "revenue_experiment_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revenue_experiments_key_key"
  ON "revenue_experiments"("key");

CREATE INDEX "revenue_experiments_status_startedAt_idx"
  ON "revenue_experiments"("status", "startedAt");

CREATE INDEX "revenue_experiments_actionId_createdAt_idx"
  ON "revenue_experiments"("actionId", "createdAt");

CREATE UNIQUE INDEX "revenue_experiment_assignments_experimentId_sessionId_key"
  ON "revenue_experiment_assignments"("experimentId", "sessionId");

CREATE INDEX "revenue_experiment_assignments_experimentId_arm_assignedAt_idx"
  ON "revenue_experiment_assignments"("experimentId", "arm", "assignedAt");

CREATE INDEX "revenue_experiment_assignments_sessionId_assignedAt_idx"
  ON "revenue_experiment_assignments"("sessionId", "assignedAt");

ALTER TABLE "revenue_experiments"
  ADD CONSTRAINT "revenue_experiments_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "revenue_actions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revenue_experiments"
  ADD CONSTRAINT "revenue_experiments_startedById_fkey"
  FOREIGN KEY ("startedById") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_experiments"
  ADD CONSTRAINT "revenue_experiments_endedById_fkey"
  FOREIGN KEY ("endedById") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_experiment_assignments"
  ADD CONSTRAINT "revenue_experiment_assignments_experimentId_fkey"
  FOREIGN KEY ("experimentId") REFERENCES "revenue_experiments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
