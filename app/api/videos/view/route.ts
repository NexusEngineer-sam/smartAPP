import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null) as { videoId?: string } | null;
  if (!body?.videoId || typeof body.videoId !== "string" || body.videoId.length > 40) {
    return NextResponse.json({ error: "Invalid video." }, { status: 400 });
  }
  const video = await prisma.campusVideo.updateMany({
    where: { id: body.videoId, status: "PUBLISHED", userId: { not: user.id } },
    data: { views: { increment: 1 } },
  });
  return NextResponse.json({ counted: video.count === 1 });
}
