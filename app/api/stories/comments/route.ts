import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

async function ensureRepliesTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CampusStoryReply" (
      "id" TEXT PRIMARY KEY,
      "storyId" TEXT NOT NULL REFERENCES "CampusStory"("id") ON DELETE CASCADE,
      "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "body" VARCHAR(500) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CampusStoryReply_storyId_createdAt_idx" ON "CampusStoryReply" ("storyId","createdAt")`);
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const storyId = new URL(request.url).searchParams.get("storyId") || "";
  if (!storyId || storyId.length > 100) return NextResponse.json({ error: "Story haijapatikana." }, { status: 400 });
  try {
    await ensureRepliesTable();
    const replies = await prisma.$queryRaw<Array<Record<string, unknown>>> `
      SELECT r."id",r."body",r."createdAt",u."name" AS "authorName",u."avatarUrl" AS "authorAvatar"
      FROM "CampusStoryReply" r JOIN "User" u ON u."id"=r."userId"
      JOIN "CampusStory" s ON s."id"=r."storyId"
      WHERE r."storyId"=${storyId} AND s."expiresAt">NOW() AND u."isActive"=true
      ORDER BY r."createdAt" ASC LIMIT 200
    `;
    return NextResponse.json({ replies });
  } catch {
    return NextResponse.json({ error: "Majibu hayapatikani kwa sasa." }, { status: 500 });
  }
}

const schema = z.object({ storyId: z.string().min(1).max(100), body: z.string().trim().min(1).max(500) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Andika reply fupi ya hadi herufi 500." }, { status: 400 });
  try {
    await ensureRepliesTable();
    const story = await prisma.$queryRaw<Array<{id:string}>>`
      SELECT "id" FROM "CampusStory" WHERE "id"=${parsed.data.storyId} AND "expiresAt">NOW() LIMIT 1
    `;
    if (!story.length) return NextResponse.json({ error: "Status imeisha muda au haipo." }, { status: 404 });
    const id = randomUUID();
    await prisma.$executeRaw`INSERT INTO "CampusStoryReply" ("id","storyId","userId","body") VALUES (${id},${parsed.data.storyId},${user.id},${parsed.data.body})`;
    const owner = await prisma.$queryRaw<Array<{userId:string}>>`SELECT "userId" FROM "CampusStory" WHERE "id"=${parsed.data.storyId} LIMIT 1`;
    if (owner.length && owner[0].userId !== user.id) {
      const ownerId = owner[0].userId;
      // Deliver this status comment into the owner DM inbox.
      let conversation = await prisma.chatConversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { participants: { some: { userId: user.id } } },
            { participants: { some: { userId: ownerId } } },
          ],
          participants: { every: { userId: { in: [user.id, ownerId] } } },
        },
        select: { id: true },
      });
      if (!conversation) {
        conversation = await prisma.chatConversation.create({
          data: { createdById: user.id, participants: { create: [{ userId: user.id }, { userId: ownerId }] } },
          select: { id: true },
        });
      }
      const chatBody = "💬 Comment kwenye status yako:\n" + parsed.data.body;
      await prisma.chatMessage.create({ data: { conversationId: conversation.id, senderId: user.id, body: chatBody } });
      await prisma.chatConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      const title = "Comment mpya kwenye status yako";
      const notificationBody = user.name + ": " + parsed.data.body.slice(0, 110);
      await prisma.notification.create({ data: { userId: ownerId, title, body: notificationBody, channel: "IN_APP", status: "QUEUED", dedupeKey: `story-reply:${randomUUID()}` } });
      try { await sendPushToUser(ownerId, title, notificationBody, "/"); } catch { /* DM and in-app notification remain available */ }
    }
    return NextResponse.json({ reply: { id, body: parsed.data.body, authorName: user.name, authorAvatar: user.avatarUrl, createdAt: new Date().toISOString() } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Reply haijahifadhiwa. Jaribu tena." }, { status: 500 });
  }
}
