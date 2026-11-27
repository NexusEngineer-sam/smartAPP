ALTER TABLE "AdCampaign"
  ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;

ALTER TABLE "AdCampaign"
  ALTER COLUMN "budgetTzs" SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS "AdLike" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdLike_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "AdComment" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" VARCHAR(1000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdComment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AdLike_campaignId_userId_key" ON "AdLike"("campaignId", "userId");
CREATE INDEX IF NOT EXISTS "AdLike_campaignId_createdAt_idx" ON "AdLike"("campaignId", "createdAt");
CREATE INDEX IF NOT EXISTS "AdComment_campaignId_createdAt_idx" ON "AdComment"("campaignId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "AdLike" ADD CONSTRAINT "AdLike_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AdLike" ADD CONSTRAINT "AdLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AdComment" ADD CONSTRAINT "AdComment_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "AdComment" ADD CONSTRAINT "AdComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
