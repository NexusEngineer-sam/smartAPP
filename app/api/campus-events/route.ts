import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const events = await prisma.campusEvent.findMany({
    where: { status: "APPROVED", endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: 60,
    include: {
      organizer: { select: { name: true, role: true } },
      attendees: { where: { userId: user.id }, select: { id: true } },
      _count: { select: { attendees: true } },
    },
  });
  return NextResponse.json({ events: events.map(({ attendees, _count, ...event }) => ({
    ...event, attendeeCount: _count.attendees, joined: attendees.length > 0,
    verified: event.organizer.role === "ADMIN" || event.status === "APPROVED",
  })) });
}

const eventSchema = z.object({
  title: z.string().trim().min(4).max(140),
  description: z.string().trim().min(10).max(2000),
  category: z.string().trim().min(2).max(40),
  venue: z.string().trim().min(2).max(160),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  organizerName: z.string().trim().min(2).max(120),
  contact: z.string().trim().max(120).optional().nullable(),
}).refine(v => new Date(v.endsAt) > new Date(v.startsAt), { message: "End time must be after start time." });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check the event details and make sure the end time is after the start time." }, { status: 400 });
  const data = parsed.data;
  const event = await prisma.campusEvent.create({
    data: {
      ...data, startsAt: new Date(data.startsAt), endsAt: new Date(data.endsAt),
      organizerId: user.id, status: user.role === "ADMIN" ? "APPROVED" : "PENDING",
      approvedAt: user.role === "ADMIN" ? new Date() : null,
    },
  });
  await prisma.auditLog.create({ data: {
    actorId: user.id, action: user.role === "ADMIN" ? "CAMPUS_EVENT_PUBLISHED" : "CAMPUS_EVENT_SUBMITTED",
    entityType: "CampusEvent", entityId: event.id,
  } });
  return NextResponse.json({ event, message: user.role === "ADMIN" ? "Event published." : "Event sent for admin approval." }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = z.object({ eventId: z.string().cuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const event = await prisma.campusEvent.findFirst({ where: { id: parsed.data.eventId, status: "APPROVED" } });
  if (!event) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  const existing = await prisma.eventRegistration.findUnique({ where: { eventId_userId: { eventId: event.id, userId: user.id } } });
  if (existing) {
    await prisma.eventRegistration.delete({ where: { id: existing.id } });
    return NextResponse.json({ joined: false });
  }
  await prisma.eventRegistration.create({ data: { eventId: event.id, userId: user.id } });
  return NextResponse.json({ joined: true });
}
