import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

async function ensureStoriesTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CampusStory" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "content" VARCHAR(500) NOT NULL DEFAULT '',
      "mediaUrl" TEXT,
      "mediaType" VARCHAR(10),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "expiresAt" TIMESTAMP(3) NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CampusStory_expiresAt_createdAt_idx" ON "CampusStory" ("expiresAt","createdAt")`);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    await ensureStoriesTable();
    const stories = await prisma.$queryRaw<Array<Record<string, unknown>>> `
      SELECT s."id",s."content",s."mediaUrl",s."mediaType",s."createdAt",s."expiresAt",
        u."id" AS "authorId",u."name" AS "authorName",u."avatarUrl" AS "authorAvatar"
      FROM "CampusStory" s JOIN "User" u ON u."id"=s."userId"
      WHERE s."expiresAt">NOW() AND u."isActive"=true
      ORDER BY s."createdAt" DESC LIMIT 100
    `;
    return NextResponse.json({ stories });
  } catch {
    return NextResponse.json({ error: "Stories are temporarily unavailable." }, { status: 500 });
  }
}

const schema = z.object({
  content: z.string().trim().max(500).default(""),
  mediaUrl: z.string().url().max(2000).nullable().optional(),
  mediaType: z.enum(["image","video"]).nullable().optional()
}).refine(v => v.content.length > 0 || !!v.mediaUrl, { message: "Write a status or attach a photo/video." });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write a status or attach a photo/video." }, { status: 400 });
  if (parsed.data.mediaUrl && !parsed.data.mediaUrl.startsWith("https://res.cloudinary.com/")) return NextResponse.json({ error: "Unsupported media URL." }, { status: 400 });
  if (!!parsed.data.mediaUrl !== !!parsed.data.mediaType) return NextResponse.json({ error: "Media type is missing." }, { status: 400 });
  try {
    await ensureStoriesTable();
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.$executeRaw`INSERT INTO "CampusStory" ("id","userId","content","mediaUrl","mediaType","expiresAt") VALUES (${id},${user.id},${parsed.data.content},${parsed.data.mediaUrl || null},${parsed.data.mediaType || null},${expiresAt})`;
    return NextResponse.json({ story: { id, content: parsed.data.content, mediaUrl: parsed.data.mediaUrl || null, mediaType: parsed.data.mediaType || null, authorId: user.id, authorName: user.name, authorAvatar: user.avatarUrl, createdAt: new Date().toISOString(), expiresAt } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not publish your status. Try again." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { storyId?: string } | null;
  if (!body?.storyId || typeof body.storyId !== "string" || body.storyId.length > 100) {
    return NextResponse.json({ error: "Status haijapatikana." }, { status: 400 });
  }
  try {
    await ensureStoriesTable();
    const deleted = await prisma.$executeRaw`
      DELETE FROM "CampusStory" WHERE "id"=${body.storyId} AND "userId"=${user.id}
    `;
    if (!deleted) return NextResponse.json({ error: "Huwezi kufuta status ya mtu mwingine au status haipo." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Status haikufutika. Jaribu tena." }, { status: 500 });
  }
}
