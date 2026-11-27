import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const videos = await prisma.campusVideo.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      id: true, videoUrl: true, thumbnailUrl: true, caption: true,
      category: true, durationSeconds: true, views: true, createdAt: true,
      user: { select: { id: true, name: true, role: true, avatarUrl: true } },
    },
  });
  return NextResponse.json({ videos });
}

const schema = z.object({
  publicId: z.string().min(8).max(300).startsWith("campus-videos/"),
  videoUrl: z.string().url().max(2000).refine(v => v.startsWith("https://res.cloudinary.com/")),
  thumbnailUrl: z.string().url().max(2000).optional().or(z.literal("")),
  caption: z.string().trim().max(500).default(""),
  category: z.enum(["Campus", "Education", "Technology", "Events", "Entertainment", "Sports"]).default("Campus"),
  durationSeconds: z.number().int().min(0).max(300),
  bytes: z.number().int().positive().max(100 * 1024 * 1024),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Video details are invalid. Videos must be 100 MB or less and up to 5 minutes." }, { status: 400 });
  const data = parsed.data;
  if (!data.publicId.startsWith("campus-videos/")) return NextResponse.json({ error: "Invalid video storage path." }, { status: 400 });
  const video = await prisma.campusVideo.create({
    data: {
      userId: user.id, publicId: data.publicId, videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl || null, caption: data.caption,
      category: data.category, durationSeconds: data.durationSeconds, bytes: data.bytes,
    },
    select: { id: true, videoUrl: true, thumbnailUrl: true, caption: true, category: true, durationSeconds: true, views: true, createdAt: true, user: { select: { id: true, name: true, role: true, avatarUrl: true } } },
  });
  return NextResponse.json({ video }, { status: 201 });
}
