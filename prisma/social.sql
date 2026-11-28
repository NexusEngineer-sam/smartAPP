CREATE TABLE IF NOT EXISTS "SocialPost" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "content" VARCHAR(1200) NOT NULL DEFAULT '',
  "mediaUrl" TEXT,
  "mediaType" VARCHAR(10),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "SocialPost" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE "SocialPost" ADD COLUMN IF NOT EXISTS "mediaType" VARCHAR(10);
CREATE INDEX IF NOT EXISTS "SocialPost_createdAt_idx" ON "SocialPost"("createdAt");
CREATE INDEX IF NOT EXISTS "SocialPost_userId_createdAt_idx" ON "SocialPost"("userId","createdAt");
CREATE TABLE IF NOT EXISTS "SocialPostLike" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "SocialPost"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialPostLike_postId_userId_key" UNIQUE ("postId","userId")
);
CREATE INDEX IF NOT EXISTS "SocialPostLike_postId_idx" ON "SocialPostLike"("postId");
CREATE TABLE IF NOT EXISTS "SocialPostComment" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "SocialPost"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" VARCHAR(800) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SocialPostComment_postId_createdAt_idx" ON "SocialPostComment"("postId","createdAt");

CREATE TABLE IF NOT EXISTS "SocialPostSave" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "SocialPost"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialPostSave_postId_userId_key" UNIQUE ("postId","userId")
);
CREATE INDEX IF NOT EXISTS "SocialPostSave_userId_createdAt_idx" ON "SocialPostSave"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "SocialPostSave_postId_idx" ON "SocialPostSave"("postId");
