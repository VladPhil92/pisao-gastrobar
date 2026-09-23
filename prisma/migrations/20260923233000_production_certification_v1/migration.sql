CREATE TABLE "integration_evidence" (
    "id" TEXT NOT NULL,
    "integration" VARCHAR(32) NOT NULL,
    "event" VARCHAR(64) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "integration_evidence_integration_status_createdAt_idx"
ON "integration_evidence"("integration", "status", "createdAt");

CREATE INDEX "integration_evidence_integration_event_createdAt_idx"
ON "integration_evidence"("integration", "event", "createdAt");

CREATE INDEX "integration_evidence_createdAt_idx"
ON "integration_evidence"("createdAt");
