CREATE TABLE "meta_data_deletion_requests" (
    "id" TEXT NOT NULL,
    "providerUserIdHash" VARCHAR(64) NOT NULL,
    "confirmationCode" VARCHAR(64) NOT NULL,
    "status" VARCHAR(48) NOT NULL DEFAULT 'COMPLETED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "meta_data_deletion_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meta_data_deletion_requests_confirmationCode_key"
  ON "meta_data_deletion_requests"("confirmationCode");

CREATE INDEX "meta_data_deletion_requests_providerUserIdHash_requestedAt_idx"
  ON "meta_data_deletion_requests"("providerUserIdHash", "requestedAt");

CREATE INDEX "meta_data_deletion_requests_status_requestedAt_idx"
  ON "meta_data_deletion_requests"("status", "requestedAt");
