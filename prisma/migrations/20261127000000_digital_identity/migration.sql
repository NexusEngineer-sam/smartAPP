CREATE TABLE "IdentityToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdentityToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdentityToken_tokenHash_key" ON "IdentityToken"("tokenHash");
CREATE INDEX "IdentityToken_userId_createdAt_idx" ON "IdentityToken"("userId", "createdAt");
CREATE INDEX "IdentityToken_expiresAt_idx" ON "IdentityToken"("expiresAt");

ALTER TABLE "IdentityToken"
ADD CONSTRAINT "IdentityToken_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
