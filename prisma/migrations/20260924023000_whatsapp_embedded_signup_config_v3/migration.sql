CREATE TABLE "whatsapp_meta_config" (
    "id" VARCHAR(24) NOT NULL DEFAULT 'primary',
    "embeddedSignupConfigId" VARCHAR(128),
    "updatedByUserId" VARCHAR(64),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_meta_config_pkey" PRIMARY KEY ("id")
);
