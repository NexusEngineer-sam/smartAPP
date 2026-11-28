import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

async function ensureEngagementTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CampusStoryView" (
      "id" TEXT PRIMARY KEY,
      "storyId" TEXT NOT NULL REFERENCES "CampusStory"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CampusStoryView_storyId_userId_key" UNIQUE ("storyId","userId")
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CampusStoryLike" (
      "id" TEXT PRIMARY KEY,
      "storyId" TEXT NOT NULL REFERENCES "CampusStory"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CampusStoryLike_storyId_userId_key" UNIQUE ("storyId","userId")
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CampusStoryView_storyId_viewedAt_idx" ON "CampusStoryView" ("storyId","viewedAt" DESC)`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CampusStoryLike_storyId_createdAt_idx" ON "CampusStoryLike" ("storyId","createdAt" DESC)`);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const storyId = new URL(request.url).searchParams.get("storyId") || "";
  if (!storyId || storyId.length > 100) return NextResponse.json({ error: "Status haijapatikana." }, { status: 400 });
  try {
    await ensureEngagementTables();
    const story = await prisma.$queryRaw<Array<{id:string;userId:string}>>`
      SELECT "id","userId" FROM "CampusStory" WHERE "id"=${storyId} AND "expiresAt">NOW() LIMIT 1
    `;
    if (!story.length) return NextResponse.json({ error: "Status imeisha muda au haipo." }, { status: 404 });
    const [viewers, likes, mine] = await Promise.all([
      prisma.$queryRaw<Array<Record<string,unknown>>>`
        SELECT v."userId",u."name",u."avatarUrl",v."viewedAt"
        FROM "CampusStoryView" v JOIN "User" u ON u."id"=v."userId"
        WHERE v."storyId"=${storyId} AND u."isActive"=true
        ORDER BY v."viewedAt" DESC LIMIT 500
      `,
      prisma.$queryRaw<Array<Record<string,unknown>>>`
        SELECT l."userId",u."name",u."avatarUrl",l."createdAt"
        FROM "CampusStoryLike" l JOIN "User" u ON u."id"=l."userId"
        WHERE l."storyId"=${storyId} AND u."isActive"=true
        ORDER BY l."createdAt" DESC LIMIT 500
      `,
      prisma.$queryRaw<Array<{id:string}>>`
        SELECT "id" FROM "CampusStoryLike" WHERE "storyId"=${storyId} AND "userId"=${user.id} LIMIT 1
      `
    ]);
    return NextResponse.json({ viewers, likes, myLiked: mine.length>0, viewCount:viewers.length, likeCount:likes.length, isOwner:story[0].userId===user.id });
  } catch {
    return NextResponse.json({ error: "Taarifa za status hazipatikani kwa sasa." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as {storyId?:string;action?:string}|null;
  if (!body?.storyId || body.storyId.length>100 || !["view","like"].includes(body.action||"")) {
    return NextResponse.json({ error: "Ombi si sahihi." }, { status: 400 });
  }
  try {
    await ensureEngagementTables();
    const story = await prisma.$queryRaw<Array<{id:string;userId:string}>>`
      SELECT "id","userId" FROM "CampusStory" WHERE "id"=${body.storyId} AND "expiresAt">NOW() LIMIT 1
    `;
    if (!story.length) return NextResponse.json({ error: "Status imeisha muda au haipo." }, { status: 404 });
    if (story[0].userId===user.id) return NextResponse.json({ ok:true, myLiked:false });
    if (body.action==="view") {
      await prisma.$executeRaw`
        INSERT INTO "CampusStoryView" ("id","storyId","userId") VALUES (${randomUUID()},${body.storyId},${user.id})
        ON CONFLICT ("storyId","userId") DO NOTHING
      `;
    } else {
      const existing = await prisma.$queryRaw<Array<{id:string}>>`
        SELECT "id" FROM "CampusStoryLike" WHERE "storyId"=${body.storyId} AND "userId"=${user.id} LIMIT 1
      `;
      if (existing.length) {
        await prisma.$executeRaw`DELETE FROM "CampusStoryLike" WHERE "storyId"=${body.storyId} AND "userId"=${user.id}`;
      } else {
        await prisma.$executeRaw`INSERT INTO "CampusStoryLike" ("id","storyId","userId") VALUES (${randomUUID()},${body.storyId},${user.id})`;
        await prisma.notification.create({
          data: { userId:story[0].userId, title:"Like mpya kwenye status yako", body:user.name+" amependa status yako ❤️", channel:"IN_APP", status:"QUEUED", dedupeKey:"story-like:"+randomUUID() }
        });
      }
    }
    const mine = await prisma.$queryRaw<Array<{id:string}>>`
      SELECT "id" FROM "CampusStoryLike" WHERE "storyId"=${body.storyId} AND "userId"=${user.id} LIMIT 1
    `;
    return NextResponse.json({ ok:true, myLiked:mine.length>0 });
  } catch {
    return NextResponse.json({ error: "Hatukuweza kuhifadhi kitendo hiki." }, { status: 500 });
  }
}
