import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const current = await prisma.user.findUnique({ where: { id: user.id }, select: { classGroupId: true, role: true } });
  if (!current?.classGroupId || current.role !== "STUDENT") return NextResponse.json({ messages: [], className: null });
  const [messages, campusClass] = await Promise.all([
    prisma.classMessage.findMany({ where: { classId: current.classGroupId }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, body: true, createdAt: true, sender: { select: { name: true } } } }),
    prisma.campusClass.findUnique({ where: { id: current.classGroupId }, select: { name: true } })
  ]);
  return NextResponse.json({ messages, className: campusClass?.name ?? null });
}