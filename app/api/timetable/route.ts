import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const events = await prisma.timetableEvent.findMany({
    where: { isActive: true, recipients: { some: { userId: user.id } }, endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" }, take: 30,
    select: { id: true, title: true, courseCode: true, location: true, startsAt: true, endsAt: true, reminderMins: true },
  });
  return NextResponse.json({ events });
}
