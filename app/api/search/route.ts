import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const query = (request.nextUrl.searchParams.get("q") || "").trim().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ results: [] });

  const contains = { contains: query, mode: "insensitive" as const };
  const [students, announcements, events, videos, communities] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, id: { not: viewer.id }, OR: [{ name: contains }, { university: contains }, { faculty: contains }, { course: contains }] },
      select: { id: true, name: true, university: true, course: true, avatarUrl: true },
      take: 5, orderBy: { name: "asc" }
    }),
    prisma.announcement.findMany({
      where: { published: true, OR: [{ title: contains }, { body: contains }] },
      select: { id: true, title: true, body: true, createdAt: true }, take: 5, orderBy: { createdAt: "desc" }
    }),
    prisma.campusEvent.findMany({
      where: { status: "APPROVED", OR: [{ title: contains }, { description: contains }, { category: contains }, { venue: contains }] },
      select: { id: true, title: true, category: true, venue: true, startsAt: true }, take: 5, orderBy: { startsAt: "asc" }
    }),
    prisma.campusVideo.findMany({
      where: { status: "PUBLISHED", OR: [{ caption: contains }, { category: contains }] },
      select: { id: true, caption: true, category: true }, take: 5, orderBy: { createdAt: "desc" }
    }),
    prisma.globalCommunity.findMany({
      where: { OR: [{ name: contains }, { country: contains }, { university: contains }, { category: contains }, { description: contains }] },
      select: { id: true, name: true, country: true, university: true, category: true }, take: 5, orderBy: { members: { _count: "desc" } }
    })
  ]);

  const results = [
    ...students.map(item => ({ id: item.id, type: "student", title: item.name, subtitle: [item.course, item.university].filter(Boolean).join(" · ") || "Student profile" })),
    ...announcements.map(item => ({ id: item.id, type: "news", title: item.title, subtitle: item.body.slice(0, 110) })),
    ...events.map(item => ({ id: item.id, type: "event", title: item.title, subtitle: [item.category, item.venue].filter(Boolean).join(" · ") })),
    ...videos.map(item => ({ id: item.id, type: "video", title: item.caption, subtitle: item.category })),
    ...communities.map(item => ({ id: item.id, type: "community", title: item.name, subtitle: [item.category, item.university, item.country].filter(Boolean).join(" · ") }))
  ];
  return NextResponse.json({ results });
}
