import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifySocialUser } from "@/lib/social-notifications";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const posts = await prisma.$queryRaw<Array<Record<string, unknown>>> `
    SELECT p."id", p."content", p."createdAt",
      u."id" AS "authorId", u."name" AS "authorName", u."avatarUrl" AS "authorAvatar",
      (SELECT COUNT(*)::int FROM "SocialPostLike" l WHERE l."postId"=p."id") AS "likes",
      EXISTS(SELECT 1 FROM "SocialPostLike" mine WHERE mine."postId"=p."id" AND mine."userId"=${user.id}) AS "likedByMe",
      (SELECT COUNT(*)::int FROM "SocialPostComment" c WHERE c."postId"=p."id") AS "comments"
    FROM "SocialPost" p JOIN "User" u ON u."id"=p."userId"
    WHERE u."isActive"=true
    ORDER BY p."createdAt" DESC LIMIT 50
  `;
  return NextResponse.json({ posts });
}

const postSchema = z.object({ content: z.string().trim().min(1).max(1200) });
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Post must contain 1–1200 characters." }, { status: 400 });
  const id = randomUUID();
  await prisma.$executeRaw `INSERT INTO "SocialPost" ("id","userId","content") VALUES (${id},${user.id},${parsed.data.content})`;
  return NextResponse.json({ post: { id, content: parsed.data.content, authorName: user.name, authorAvatar: user.avatarUrl, likes: 0, comments: 0, likedByMe: false, createdAt: new Date().toISOString() } }, { status: 201 });
}

const likeSchema = z.object({ postId: z.string().uuid() });
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = likeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  const target = await prisma.$queryRaw<Array<{ id: string; userId: string }>> `SELECT "id","userId" FROM "SocialPost" WHERE "id"=${parsed.data.postId} LIMIT 1`;
  if (!target.length) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  const exists = await prisma.$queryRaw<Array<{ id: string }>> `SELECT "id" FROM "SocialPostLike" WHERE "postId"=${parsed.data.postId} AND "userId"=${user.id} LIMIT 1`;
  if (exists.length) {
    await prisma.$executeRaw `DELETE FROM "SocialPostLike" WHERE "postId"=${parsed.data.postId} AND "userId"=${user.id}`;
  } else {
    const inserted = await prisma.$executeRaw `INSERT INTO "SocialPostLike" ("id","postId","userId") VALUES (${randomUUID()},${parsed.data.postId},${user.id}) ON CONFLICT ("postId","userId") DO NOTHING`;
    if (inserted > 0) {
      await notifySocialUser({ recipientId: target[0].userId, actorId: user.id, actorName: user.name, kind: "like", postId: parsed.data.postId });
    }
  }
  const count = await prisma.$queryRaw<Array<{ count: number }>> `SELECT COUNT(*)::int AS count FROM "SocialPostLike" WHERE "postId"=${parsed.data.postId}`;
  return NextResponse.json({ liked: !exists.length, likes: count[0]?.count ?? 0 });
}
