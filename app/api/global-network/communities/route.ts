import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 80);
  const category = (url.searchParams.get("category") || "").trim().slice(0, 40);
  const communities = await prisma.globalCommunity.findMany({
    where: {
      ...(category && category !== "All" ? { category } : {}),
      ...(q ? { OR: [
        { name: { contains: q, mode: "insensitive" } },
        { country: { contains: q, mode: "insensitive" } },
        { university: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
    take: 100,
    include: {
      _count: { select: { members: true } },
      members: { where: { userId: user.id }, select: { id: true } },
    },
  });
  return NextResponse.json({ communities: communities.map(({ members, _count, ...c }) => ({
    ...c, memberCount: _count.members, joined: members.length > 0,
  })) });
}

const createSchema = z.object({
  name: z.string().trim().min(3).max(100),
  country: z.string().trim().min(2).max(80),
  university: z.string().trim().max(140).optional().nullable(),
  category: z.enum(["Technology", "Research", "Entrepreneurship", "Opportunities", "Study", "Creative", "General"]),
  description: z.string().trim().min(15).max(500),
  language: z.string().trim().min(2).max(40).default("English"),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check the community details and try again." }, { status: 400 });
  const slugBase = parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "campus-community";
  const slug = `${slugBase}-${user.id.slice(-6)}`;
  const community = await prisma.globalCommunity.create({ data: {
    ...parsed.data, university: parsed.data.university || null, slug, createdById: user.id,
    members: { create: { userId: user.id, role: "ADMIN" } },
  }, include: { _count: { select: { members: true } } } });
  return NextResponse.json({ community: { ...community, memberCount: community._count.members, joined: true } }, { status: 201 });
}
