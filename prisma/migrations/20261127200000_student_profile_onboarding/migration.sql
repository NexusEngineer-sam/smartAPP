ALTER TABLE "User"
  ADD COLUMN "university" TEXT,
  ADD COLUMN "faculty" TEXT,
  ADD COLUMN "course" TEXT,
  ADD COLUMN "profileCompleted" BOOLEAN NOT NULL DEFAULT false;
