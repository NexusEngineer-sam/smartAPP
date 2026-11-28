CREATE TABLE IF NOT EXISTS "GoogleDriveBackupConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "googleEmail" TEXT,
  "encryptedRefreshToken" TEXT NOT NULL,
  "frequency" VARCHAR(12) NOT NULL DEFAULT 'WEEKLY',
  "lastBackupAt" TIMESTAMP(3),
  "lastBackupFileId" TEXT,
  "nextBackupAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleDriveBackupConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "GoogleDriveBackupConnection_userId_key"
  ON "GoogleDriveBackupConnection"("userId");
CREATE INDEX IF NOT EXISTS "GoogleDriveBackupConnection_nextBackupAt_idx"
  ON "GoogleDriveBackupConnection"("nextBackupAt");
DO $$ BEGIN
  ALTER TABLE "GoogleDriveBackupConnection"
    ADD CONSTRAINT "GoogleDriveBackupConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
