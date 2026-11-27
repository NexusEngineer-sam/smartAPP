import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifySocialUser } from "@/lib/social-notifications";

export const runtime = "nodejs";
const schema = z.object({ postId: z.string().uuid(), body: z.string().trim().min(1).max(800) });

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const postId = new URL(request.url).searchParams.get("postId");
  if (!postId || !/^[0-9a-f-]{36}$/i.test(postId)) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  const comments = await prisma.$queryRaw<Array<Record<string, unknown>>> `
    SELECT c."id",c."body",c."createdAt",u."name" AS "authorName",u."avatarUrl" AS "authorAvatar"
    FROM "SocialPostComment" c JOIN "User" u ON u."id"=c."userId"
    WHERE c."postId"=${postId} AND u."isActive"=true ORDER BY c."createdAt" ASC LIMIT 100
  `;
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Comment must contain 1–800 characters." }, { status: 400 });
  const id = randomUUID();
  const inserted = await prisma.$executeRaw `INSERT INTO "SocialPostComment" ("id","postId","userId","body") SELECT ${id},p."id",${user.id},${parsed.data.body} FROM "SocialPost" p WHERE p."id"=${parsed.data.postId}`;
  if (!inserted) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  const owner = await prisma.$queryRaw<Array<{ userId: string }>> `SELECT "userId" FROM "SocialPost" WHERE "id"=${parsed.data.postId} LIMIT 1`;
  if (owner.length) {
    await notifySocialUser({ recipientId: owner[0].userId, actorId: user.id, actorName: user.name, kind: "comment", postId: parsed.data.postId, preview: parsed.data.body });
  }
  return NextResponse.json({ comment: { id, body: parsed.data.body, authorName: user.name, createdAt: new Date().toISOString() } }, { status: 201 });
}
