DO $$ BEGIN
  CREATE TYPE "CampusEventStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "CampusEvent" (
  "id" TEXT NOT NULL,
  "organizerId" TEXT NOT NULL,
  "title" VARCHAR(140) NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "category" VARCHAR(40) NOT NULL DEFAULT 'Campus',
  "venue" VARCHAR(160) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "organizerName" VARCHAR(120) NOT NULL,
  "contact" VARCHAR(120),
  "status" "CampusEventStatus" NOT NULL DEFAULT 'PENDING',
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampusEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CampusEvent_status_startsAt_idx" ON "CampusEvent"("status","startsAt");
CREATE INDEX IF NOT EXISTS "CampusEvent_organizerId_createdAt_idx" ON "CampusEvent"("organizerId","createdAt");
DO $$ BEGIN
  ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "EventRegistration" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId","userId");
CREATE INDEX IF NOT EXISTS "EventRegistration_userId_createdAt_idx" ON "EventRegistration"("userId","createdAt");
DO $$ BEGIN
  ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CampusEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
