import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  const community = await prisma.globalCommunity.findUnique({ where: { id }, select: { id: true } });
  if (!community) return NextResponse.json({ error: "Community not found." }, { status: 404 });
  await prisma.globalCommunityMembership.upsert({
    where: { communityId_userId: { communityId: id, userId: user.id } },
    create: { communityId: id, userId: user.id },
    update: {},
  });
  return NextResponse.json({ success: true, joined: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const { id } = await params;
  await prisma.globalCommunityMembership.deleteMany({ where: { communityId: id, userId: user.id, role: "MEMBER" } });
  return NextResponse.json({ success: true, joined: false });
}
