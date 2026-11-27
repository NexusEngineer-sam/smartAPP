CREATE TABLE IF NOT EXISTS "PersonalSchedule" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "kind" VARCHAR(20) NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "courseCode" VARCHAR(40),
  "location" VARCHAR(140),
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "reminderMins" INTEGER NOT NULL DEFAULT 15,
  "repeatWeekly" BOOLEAN NOT NULL DEFAULT false,
  "done" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PersonalSchedule_userId_startsAt_idx" ON "PersonalSchedule"("userId","startsAt");
CREATE INDEX IF NOT EXISTS "PersonalSchedule_repeatWeekly_startsAt_idx" ON "PersonalSchedule"("repeatWeekly","startsAt");
