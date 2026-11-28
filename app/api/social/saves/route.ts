import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
const schema = z.object({ postId: z.string().uuid() });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const saves = await prisma.$queryRaw<Array<{ postId: string }>> `
    SELECT "postId" FROM "SocialPostSave" WHERE "userId"=${user.id} ORDER BY "createdAt" DESC LIMIT 500
  `;
  return NextResponse.json({ savedPostIds: saves.map(x => x.postId) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  const post = await prisma.$queryRaw<Array<{ id: string }>> `SELECT "id" FROM "SocialPost" WHERE "id"=${parsed.data.postId} LIMIT 1`;
  if (!post.length) return NextResponse.json({ error: "Post not found." }, { status: 404 });
  const existing = await prisma.$queryRaw<Array<{ id: string }>> `
    SELECT "id" FROM "SocialPostSave" WHERE "postId"=${parsed.data.postId} AND "userId"=${user.id} LIMIT 1
  `;
  if (existing.length) {
    await prisma.$executeRaw `DELETE FROM "SocialPostSave" WHERE "postId"=${parsed.data.postId} AND "userId"=${user.id}`;
    return NextResponse.json({ saved: false });
  }
  await prisma.$executeRaw `
    INSERT INTO "SocialPostSave" ("id","postId","userId") VALUES (${randomUUID()},${parsed.data.postId},${user.id})
    ON CONFLICT ("postId","userId") DO NOTHING
  `;
  return NextResponse.json({ saved: true });
}
