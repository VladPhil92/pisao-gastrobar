ALTER TABLE "usuarios"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE TABLE "admin_audit_events" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "actorRole" VARCHAR(24) NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "targetType" VARCHAR(48) NOT NULL,
  "targetId" VARCHAR(96),
  "outcome" VARCHAR(24) NOT NULL DEFAULT 'SUCCESS',
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_events_createdAt_idx"
  ON "admin_audit_events"("createdAt");

CREATE INDEX "admin_audit_events_actorUserId_createdAt_idx"
  ON "admin_audit_events"("actorUserId", "createdAt");

CREATE INDEX "admin_audit_events_action_createdAt_idx"
  ON "admin_audit_events"("action", "createdAt");

CREATE INDEX "admin_audit_events_targetType_targetId_createdAt_idx"
  ON "admin_audit_events"("targetType", "targetId", "createdAt");

ALTER TABLE "admin_audit_events"
  ADD CONSTRAINT "admin_audit_events_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "usuarios"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
