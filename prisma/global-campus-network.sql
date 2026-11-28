CREATE TABLE IF NOT EXISTS "GlobalCommunity" (
  "id" TEXT PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(120) NOT NULL UNIQUE,
  "country" VARCHAR(80) NOT NULL,
  "university" VARCHAR(140),
  "category" VARCHAR(40) NOT NULL DEFAULT 'General',
  "description" VARCHAR(500) NOT NULL,
  "language" VARCHAR(40) NOT NULL DEFAULT 'English',
  "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "GlobalCommunity_country_category_idx" ON "GlobalCommunity"("country","category");
CREATE TABLE IF NOT EXISTS "GlobalCommunityMembership" (
  "id" TEXT PRIMARY KEY,
  "communityId" TEXT NOT NULL REFERENCES "GlobalCommunity"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "role" VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GlobalCommunityMembership_communityId_userId_key" UNIQUE ("communityId","userId")
);
CREATE INDEX IF NOT EXISTS "GlobalCommunityMembership_userId_idx" ON "GlobalCommunityMembership"("userId");
INSERT INTO "GlobalCommunity" ("id","name","slug","country","category","description","language")
VALUES
('global-ai-builders','AI & Future Technology','global-ai-builders','Global','Technology','Discuss artificial intelligence, software engineering, robotics and emerging technology.','English'),
('global-research-lab','Global Research Exchange','global-research-lab','Global','Research','Share research ideas, methods, papers and opportunities for collaboration.','English'),
('global-founders','Student Founders Network','global-founders','Global','Entrepreneurship','Connect student founders, makers and innovators building real products.','English'),
('global-scholarships','Scholarships & Opportunities','global-scholarships','Global','Opportunities','Share verified scholarships, internships, fellowships and academic opportunities.','English'),
('global-study-room','Global Study Room','global-study-room','Global','Study','Find study partners, revision groups and peer learning sessions worldwide.','English'),
('global-design','Design & Creative Campus','global-design','Global','Creative','A community for design, media, creative technology and digital arts.','English')
ON CONFLICT ("slug") DO NOTHING;
