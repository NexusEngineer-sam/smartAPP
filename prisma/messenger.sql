CREATE TABLE IF NOT EXISTS "ChatConversation" (
"id" TEXT PRIMARY KEY,"isGroup" BOOLEAN NOT NULL DEFAULT FALSE,"title" VARCHAR(100),
"createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "ChatParticipant" (
"id" TEXT PRIMARY KEY,"conversationId" TEXT NOT NULL REFERENCES "ChatConversation"("id") ON DELETE CASCADE,
"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"lastReadAt" TIMESTAMP(3),
CONSTRAINT "ChatParticipant_conversationId_userId_key" UNIQUE ("conversationId","userId")
);
CREATE TABLE IF NOT EXISTS "ChatMessage" (
"id" TEXT PRIMARY KEY,"conversationId" TEXT NOT NULL REFERENCES "ChatConversation"("id") ON DELETE CASCADE,
"senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"body" VARCHAR(4000) NOT NULL,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"editedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "ChatConversation_updatedAt_idx" ON "ChatConversation"("updatedAt");
CREATE INDEX IF NOT EXISTS "ChatParticipant_userId_joinedAt_idx" ON "ChatParticipant"("userId","joinedAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_createdAt_idx" ON "ChatMessage"("conversationId","createdAt");