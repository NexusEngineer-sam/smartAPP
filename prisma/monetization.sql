DO $$ BEGIN
  CREATE TYPE "AdCampaignStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AdCampaign" (
  "id" TEXT NOT NULL,
  "advertiserId" TEXT NOT NULL,
  "businessName" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "budgetTzs" INTEGER NOT NULL,
  "status" "AdCampaignStatus" NOT NULL DEFAULT 'PENDING',
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdCampaign_status_createdAt_idx" ON "AdCampaign"("status","createdAt");
CREATE INDEX IF NOT EXISTS "AdCampaign_advertiserId_createdAt_idx" ON "AdCampaign"("advertiserId","createdAt");
DO $$ BEGIN
  ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "EngagementSession" (
  "id" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "pagePath" TEXT NOT NULL DEFAULT '/',
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "EngagementSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EngagementSession_sessionKey_key" ON "EngagementSession"("sessionKey");
CREATE INDEX IF NOT EXISTS "EngagementSession_userId_startedAt_idx" ON "EngagementSession"("userId","startedAt");
CREATE INDEX IF NOT EXISTS "EngagementSession_startedAt_idx" ON "EngagementSession"("startedAt");
DO $$ BEGIN
  ALTER TABLE "EngagementSession" ADD CONSTRAINT "EngagementSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SponsoredAdView" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "visibleSeconds" INTEGER NOT NULL DEFAULT 0,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SponsoredAdView_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SponsoredAdView_campaignId_userId_dayKey_key" ON "SponsoredAdView"("campaignId","userId","dayKey");
CREATE INDEX IF NOT EXISTS "SponsoredAdView_campaignId_dayKey_idx" ON "SponsoredAdView"("campaignId","dayKey");
CREATE INDEX IF NOT EXISTS "SponsoredAdView_userId_dayKey_idx" ON "SponsoredAdView"("userId","dayKey");
DO $$ BEGIN
  ALTER TABLE "SponsoredAdView" ADD CONSTRAINT "SponsoredAdView_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "SponsoredAdView" ADD CONSTRAINT "SponsoredAdView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CampusVideo" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "videoUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "caption" VARCHAR(500) NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Campus',
  "durationSeconds" INTEGER NOT NULL DEFAULT 0,
  "bytes" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  "views" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampusVideo_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CampusVideo_publicId_key" ON "CampusVideo"("publicId");
CREATE INDEX IF NOT EXISTS "CampusVideo_createdAt_idx" ON "CampusVideo"("createdAt");
CREATE INDEX IF NOT EXISTS "CampusVideo_userId_createdAt_idx" ON "CampusVideo"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "CampusVideo_status_createdAt_idx" ON "CampusVideo"("status","createdAt");
DO $$ BEGIN
  ALTER TABLE "CampusVideo" ADD CONSTRAINT "CampusVideo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


CREATE TABLE IF NOT EXISTS "StudentLifeItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "section" VARCHAR(32) NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "detail" VARCHAR(500),
  "amount" INTEGER,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudentLifeItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StudentLifeItem_userId_section_createdAt_idx" ON "StudentLifeItem"("userId","section","createdAt");
DO $$ BEGIN
  ALTER TABLE "StudentLifeItem" ADD CONSTRAINT "StudentLifeItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


ALTER TABLE "AdCampaign" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "AdCampaign" ALTER COLUMN "budgetTzs" SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS "AdLike" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdLike_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "AdLike_campaignId_userId_key" ON "AdLike"("campaignId","userId");
CREATE INDEX IF NOT EXISTS "AdLike_campaignId_createdAt_idx" ON "AdLike"("campaignId","createdAt");
DO $$ BEGIN
  ALTER TABLE "AdLike" ADD CONSTRAINT "AdLike_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AdLike" ADD CONSTRAINT "AdLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AdComment" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AdComment_campaignId_createdAt_idx" ON "AdComment"("campaignId","createdAt");
DO $$ BEGIN
  ALTER TABLE "AdComment" ADD CONSTRAINT "AdComment_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AdComment" ADD CONSTRAINT "AdComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- SAMWEL DATA-TO-CASH: usage analytics and auditable revenue records.
CREATE TABLE IF NOT EXISTS "DataUsageEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "bytes" BIGINT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'CLIENT_ESTIMATE',
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataUsageEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DataUsageEvent_recordedAt_idx" ON "DataUsageEvent"("recordedAt");
CREATE INDEX IF NOT EXISTS "DataUsageEvent_userId_recordedAt_idx" ON "DataUsageEvent"("userId","recordedAt");
CREATE INDEX IF NOT EXISTS "DataUsageEvent_source_recordedAt_idx" ON "DataUsageEvent"("source","recordedAt");
DO $$ BEGIN
  ALTER TABLE "DataUsageEvent" ADD CONSTRAINT "DataUsageEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "RevenueLedgerEntry" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amountTzs" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "providerReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "RevenueLedgerEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "RevenueLedgerEntry_providerReference_key" ON "RevenueLedgerEntry"("providerReference");
CREATE INDEX IF NOT EXISTS "RevenueLedgerEntry_status_createdAt_idx" ON "RevenueLedgerEntry"("status","createdAt");
CREATE INDEX IF NOT EXISTS "RevenueLedgerEntry_source_createdAt_idx" ON "RevenueLedgerEntry"("source","createdAt");
