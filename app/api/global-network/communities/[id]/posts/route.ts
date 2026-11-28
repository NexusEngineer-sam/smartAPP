import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };
const schema = z.object({ body: z.string().trim().min(1).max(2000) });

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to view this discussion." }, { status: 401 });
  const { id } = await params;
  const posts = await prisma.$queryRaw<Array<Record<string, unknown>>> `
    SELECT p."id",p."body",p."createdAt",u."id" AS "authorId",u."name" AS "authorName",u."avatarUrl" AS "authorAvatar"
    FROM "GlobalCommunityPost" p JOIN "User" u ON u."id"=p."userId"
    WHERE p."communityId"=${id} AND u."isActive"=true
    ORDER BY p."createdAt" DESC LIMIT 100
  `;
  return NextResponse.json({ posts });
}

export async function POST(request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to post." }, { status: 401 });
  const { id } = await params;
  const membership = await prisma.globalCommunityMembership.findUnique({ where: { communityId_userId: { communityId: id, userId: user.id } }, select: { id: true } });
  if (!membership) return NextResponse.json({ error: "Join this community before posting." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Post must contain 1–2000 characters." }, { status: 400 });
  const postId = randomUUID();
  await prisma.$executeRaw `INSERT INTO "GlobalCommunityPost" ("id","communityId","userId","body") VALUES (${postId},${id},${user.id},${parsed.data.body})`;
  return NextResponse.json({ post: { id: postId, body: parsed.data.body, createdAt: new Date().toISOString(), authorId: user.id, authorName: user.name, authorAvatar: user.avatarUrl } }, { status: 201 });
}
