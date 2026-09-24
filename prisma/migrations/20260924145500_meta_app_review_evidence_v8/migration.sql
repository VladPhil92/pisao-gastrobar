ALTER TABLE "whatsapp_meta_config"
  ADD COLUMN "metaAccessVerificationStatus" VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "metaAccessVerificationUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "metaAppReviewStatus" VARCHAR(24) NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "metaAppReviewUpdatedAt" TIMESTAMP(3);
