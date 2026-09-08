-- PISÁO ↔ CTG One Rewards/history durable outbox.
-- Customer-facing restaurant operations remain authoritative in PISÁO; CTG One
-- consumes these idempotent events asynchronously as the ecosystem history and
-- rewards authority.

CREATE TYPE "CtgOneRewardEventType" AS ENUM (
  'ORDER_PAID',
  'ORDER_FULFILLED',
  'ORDER_CANCELLED',
  'RESERVATION_COMPLETED'
);

CREATE TYPE "CtgOneRewardEventStatus" AS ENUM (
  'PENDING',
  'DELIVERED',
  'FAILED'
);

CREATE TABLE "ctgone_reward_outbox" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "type" "CtgOneRewardEventType" NOT NULL,
  "ctgOneSubject" TEXT NOT NULL,
  "pedidoId" TEXT,
  "reservaId" TEXT,
  "amountCop" DECIMAL(12,2),
  "status" "CtgOneRewardEventStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "deliveredAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ctgone_reward_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ctgone_reward_outbox_eventKey_key"
  ON "ctgone_reward_outbox"("eventKey");

CREATE INDEX "ctgone_reward_outbox_status_createdAt_idx"
  ON "ctgone_reward_outbox"("status", "createdAt");

CREATE INDEX "ctgone_reward_outbox_ctgOneSubject_createdAt_idx"
  ON "ctgone_reward_outbox"("ctgOneSubject", "createdAt");
