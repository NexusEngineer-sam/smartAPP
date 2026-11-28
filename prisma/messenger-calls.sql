CREATE TABLE IF NOT EXISTS "MessengerCall" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL REFERENCES "ChatConversation"("id") ON DELETE CASCADE,
  "callerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "calleeId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "kind" VARCHAR(8) NOT NULL CHECK ("kind" IN ('AUDIO','VIDEO')),
  "status" VARCHAR(12) NOT NULL DEFAULT 'RINGING' CHECK ("status" IN ('RINGING','ACCEPTED','REJECTED','ENDED','MISSED')),
  "offer" JSONB,
  "answer" JSONB,
  "callerCandidates" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "calleeCandidates" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "MessengerCall_callee_status_created_idx" ON "MessengerCall" ("calleeId","status","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "MessengerCall_conversation_created_idx" ON "MessengerCall" ("conversationId","createdAt" DESC);
