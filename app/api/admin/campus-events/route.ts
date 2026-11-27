import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentUser();
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const events = await prisma.campusEvent.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 150,
    include: {
      organizer: { select: { name: true, email: true, role: true } },
      _count: { select: { attendees: true } },
    },
  });
  return NextResponse.json({ events: events.map(({ _count, ...event }) => ({ ...event, attendeeCount: _count.attendees })) });
}

export async function PATCH(request: Request) {
  const admin = await getCurrentUser();
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = z.object({ id: z.string().cuid(), status: z.enum(["APPROVED", "REJECTED"]) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid approval action." }, { status: 400 });
  const existing = await prisma.campusEvent.findUnique({ where: { id: parsed.data.id } });
  if (!existing) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const event = await prisma.campusEvent.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status, approvedAt: parsed.data.status === "APPROVED" ? new Date() : null },
  });
  await prisma.auditLog.create({ data: {
    actorId: admin.id, action: parsed.data.status === "APPROVED" ? "CAMPUS_EVENT_APPROVED" : "CAMPUS_EVENT_REJECTED",
    entityType: "CampusEvent", entityId: event.id,
  } });
  return NextResponse.json({ event });
}
