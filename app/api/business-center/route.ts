import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const campaigns = await prisma.adCampaign.findMany({
    where: user.role === "ADMIN" ? {} : { OR: [{ status: "APPROVED" }, { advertiserId: user.id }] },
    orderBy: { createdAt: "desc" }, take: 50,
    select: { id: true, businessName: true, title: true, description: true, contact: true, budgetTzs: true, mediaUrl: true, status: true, createdAt: true, advertiserId: true, _count: { select: { likes: true, comments: true } }, likes: { where: { userId: user.id }, select: { id: true } }, comments: { take: 3, orderBy: { createdAt: "desc" }, select: { id: true, body: true, createdAt: true, user: { select: { id: true, name: true, avatarUrl: true } } } } }
  });
  return NextResponse.json({ campaigns });
}

const createSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(1000),
  contact: z.string().trim().min(5).max(100),
  mediaUrl: z.string().url().max(2000).optional().or(z.literal("")),
  budgetTzs: z.number().int().min(0).max(0).default(0)
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in to submit an advert." }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Angalia taarifa za tangazo." }, { status: 400 });
  const campaign = await prisma.adCampaign.create({ data: { ...parsed.data, mediaUrl: parsed.data.mediaUrl || null, budgetTzs: 0, advertiserId: user.id } });
  return NextResponse.json({ campaign }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = z.object({ id: z.string().cuid(), status: z.enum(["APPROVED", "REJECTED", "PENDING"]) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid campaign update." }, { status: 400 });
  const campaign = await prisma.adCampaign.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "AD_CAMPAIGN_STATUS_CHANGED", entityType: "AdCampaign", entityId: campaign.id, metadata: { status: campaign.status } } });
  return NextResponse.json({ campaign });
}
