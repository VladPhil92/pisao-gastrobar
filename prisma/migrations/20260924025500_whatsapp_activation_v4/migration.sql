ALTER TABLE "whatsapp_meta_config"
  ADD COLUMN "runtimeEnabled" BOOLEAN,
  ADD COLUMN "lastProbeAt" TIMESTAMP(3),
  ADD COLUMN "lastProbeStatus" VARCHAR(24),
  ADD COLUMN "lastProbeCode" VARCHAR(64);
