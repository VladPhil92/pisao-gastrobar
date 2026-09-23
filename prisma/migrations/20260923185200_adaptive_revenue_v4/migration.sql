CREATE TABLE "revenue_policies" (
  "id" TEXT NOT NULL,
  "key" VARCHAR(64) NOT NULL,
  "engineVersion" VARCHAR(48) NOT NULL DEFAULT 'adaptive_revenue_v4',
  "status" VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  "surface" VARCHAR(32) NOT NULL DEFAULT 'CONCIERGE',
  "actionId" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "trafficPct" INTEGER NOT NULL DEFAULT 90,
  "priorityScore" INTEGER NOT NULL DEFAULT 50,
  "minServeAssignments" INTEGER NOT NULL DEFAULT 40,
  "minHoldoutAssignments" INTEGER NOT NULL DEFAULT 20,
  "rollbackMarginPctPoints" INTEGER NOT NULL DEFAULT 2,
  "activatedById" TEXT,
  "rolledBackById" TEXT,
  "activatedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "rolledBackAt" TIMESTAMP(3),
  "lastMeasuredAt" TIMESTAMP(3),
  "lastGuardrailCheckAt" TIMESTAMP(3),
  "rollbackReason" VARCHAR(180),
  "outcome" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "revenue_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "revenue_policy_assignments" (
  "id" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "sessionId" VARCHAR(64) NOT NULL,
  "arm" VARCHAR(16) NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "servedAt" TIMESTAMP(3),
  "exposureCount" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "revenue_policy_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revenue_policies_key_key"
  ON "revenue_policies"("key");

CREATE UNIQUE INDEX "revenue_policies_experimentId_key"
  ON "revenue_policies"("experimentId");

CREATE INDEX "revenue_policies_status_priorityScore_createdAt_idx"
  ON "revenue_policies"("status", "priorityScore", "createdAt");

CREATE INDEX "revenue_policies_actionId_createdAt_idx"
  ON "revenue_policies"("actionId", "createdAt");

CREATE UNIQUE INDEX "revenue_policy_assignments_policyId_sessionId_key"
  ON "revenue_policy_assignments"("policyId", "sessionId");

CREATE INDEX "revenue_policy_assignments_policyId_arm_assignedAt_idx"
  ON "revenue_policy_assignments"("policyId", "arm", "assignedAt");

CREATE INDEX "revenue_policy_assignments_sessionId_assignedAt_idx"
  ON "revenue_policy_assignments"("sessionId", "assignedAt");

ALTER TABLE "revenue_policies"
  ADD CONSTRAINT "revenue_policies_actionId_fkey"
  FOREIGN KEY ("actionId") REFERENCES "revenue_actions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revenue_policies"
  ADD CONSTRAINT "revenue_policies_experimentId_fkey"
  FOREIGN KEY ("experimentId") REFERENCES "revenue_experiments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "revenue_policies"
  ADD CONSTRAINT "revenue_policies_activatedById_fkey"
  FOREIGN KEY ("activatedById") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_policies"
  ADD CONSTRAINT "revenue_policies_rolledBackById_fkey"
  FOREIGN KEY ("rolledBackById") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "revenue_policy_assignments"
  ADD CONSTRAINT "revenue_policy_assignments_policyId_fkey"
  FOREIGN KEY ("policyId") REFERENCES "revenue_policies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
