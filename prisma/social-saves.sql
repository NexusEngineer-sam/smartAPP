CREATE TABLE IF NOT EXISTS "SocialPostSave" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL REFERENCES "SocialPost"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SocialPostSave_postId_userId_key" UNIQUE ("postId","userId")
);
CREATE INDEX IF NOT EXISTS "SocialPostSave_userId_createdAt_idx" ON "SocialPostSave"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "SocialPostSave_postId_idx" ON "SocialPostSave"("postId");
