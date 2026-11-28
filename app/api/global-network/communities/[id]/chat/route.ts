import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ body: z.string().trim().min(1).max(2000) });

async function isMember(communityId: string, userId: string) {
  return prisma.globalCommunityMembership.findUnique({ where: { communityId_userId: { communityId, userId } }, select: { id: true } });
}

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to open this chat." }, { status: 401 });
  const { id } = await params;
  if (!await isMember(id, user.id)) return NextResponse.json({ error: "Join this community to enter its chat." }, { status: 403 });
  const messages = await prisma.$queryRaw<Array<Record<string, unknown>>> `
    SELECT m."id",m."body",m."createdAt",u."id" AS "authorId",u."name" AS "authorName",u."avatarUrl" AS "authorAvatar"
    FROM "GlobalCommunityMessage" m JOIN "User" u ON u."id"=m."userId"
    WHERE m."communityId"=${id} AND u."isActive"=true
    ORDER BY m."createdAt" DESC LIMIT 100
  `;
  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to chat." }, { status: 401 });
  const { id } = await params;
  if (!await isMember(id, user.id)) return NextResponse.json({ error: "Join this community to send messages." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message must contain 1–2000 characters." }, { status: 400 });
  const messageId = randomUUID();
  await prisma.$executeRaw `INSERT INTO "GlobalCommunityMessage" ("id","communityId","userId","body") VALUES (${messageId},${id},${user.id},${parsed.data.body})`;
  return NextResponse.json({ message: { id: messageId, body: parsed.data.body, createdAt: new Date().toISOString(), authorId: user.id, authorName: user.name, authorAvatar: user.avatarUrl } }, { status: 201 });
}
