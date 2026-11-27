import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyDataCenterAdmins } from "@/lib/data-center-alerts";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("like"), campaignId: z.string().cuid() }),
  z.object({ action: z.literal("unlike"), campaignId: z.string().cuid() }),
  z.object({ action: z.literal("comment"), campaignId: z.string().cuid(), body: z.string().trim().min(1).max(1000) }),
]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ingia kwanza kuendelea." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Taarifa si sahihi." }, { status: 400 });
  const campaign = await prisma.adCampaign.findUnique({ where: { id: parsed.data.campaignId }, select: { id: true, status: true, advertiserId: true } });
  if (!campaign || (campaign.status !== "APPROVED" && campaign.advertiserId !== user.id && user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Tangazo halipatikani." }, { status: 404 });
  }
  if (parsed.data.action === "like") {
    await prisma.adLike.upsert({ where: { campaignId_userId: { campaignId: campaign.id, userId: user.id } }, create: { campaignId: campaign.id, userId: user.id }, update: {} });
  } else if (parsed.data.action === "unlike") {
    await prisma.adLike.deleteMany({ where: { campaignId: campaign.id, userId: user.id } });
  } else {
    await prisma.adComment.create({ data: { campaignId: campaign.id, userId: user.id, body: parsed.data.body } });
    await notifyDataCenterAdmins("New Spotlight comment", `${user.name} commented on a campus advert.`, "/");
  }
  const [likes, comments] = await Promise.all([
    prisma.adLike.count({ where: { campaignId: campaign.id } }),
    prisma.adComment.findMany({ where: { campaignId: campaign.id }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, body: true, createdAt: true, user: { select: { id: true, name: true, avatarUrl: true } } } }),
  ]);
  const likedByMe = await prisma.adLike.findUnique({ where: { campaignId_userId: { campaignId: campaign.id, userId: user.id } }, select: { id: true } });
  return NextResponse.json({ likes, comments, likedByMe: !!likedByMe });
}
