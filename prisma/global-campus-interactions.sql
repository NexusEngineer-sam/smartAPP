CREATE TABLE IF NOT EXISTS "GlobalCommunityPost" (
  "id" TEXT PRIMARY KEY,
  "communityId" TEXT NOT NULL REFERENCES "GlobalCommunity"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GlobalCommunityPost_communityId_createdAt_idx" ON "GlobalCommunityPost"("communityId","createdAt");
CREATE TABLE IF NOT EXISTS "GlobalCommunityMessage" (
  "id" TEXT PRIMARY KEY,
  "communityId" TEXT NOT NULL REFERENCES "GlobalCommunity"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" VARCHAR(2000) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GlobalCommunityMessage_communityId_createdAt_idx" ON "GlobalCommunityMessage"("communityId","createdAt");
