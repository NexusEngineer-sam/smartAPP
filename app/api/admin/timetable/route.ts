import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function adminOnly() {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
}
const eventSchema = z.object({
  title: z.string().trim().min(3).max(140),
  courseCode: z.string().trim().max(30).optional().nullable(),
  location: z.string().trim().max(120).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reminderMins: z.number().int().min(0).max(1440).default(30),
  userIds: z.array(z.string().cuid()).max(500).default([]),
}).refine(v => new Date(v.endsAt) > new Date(v.startsAt), { message: "End time must be after start time." });

export async function GET() {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const [events, students] = await Promise.all([
    prisma.timetableEvent.findMany({
      orderBy: { startsAt: "asc" }, take: 100,
      include: { recipients: { select: { userId: true } } },
    }),
    prisma.user.findMany({ where: { isActive: true, role: "STUDENT" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" }, take: 500 }),
  ]);
  return NextResponse.json({ events, students });
}
export async function POST(request: Request) {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Check event details, date/time and selected students." }, { status: 400 });
  const { userIds, startsAt, endsAt, ...data } = parsed.data;
  const validUsers = await prisma.user.findMany({ where: { id: { in: userIds }, role: "STUDENT", isActive: true }, select: { id: true } });
  if (validUsers.length !== new Set(userIds).size) return NextResponse.json({ error: "One or more selected student accounts are invalid or inactive." }, { status: 400 });
  const event = await prisma.timetableEvent.create({
    data: {
      ...data, startsAt: new Date(startsAt), endsAt: new Date(endsAt),
      recipients: { create: validUsers.map(user => ({ userId: user.id })) },
    },
    include: { recipients: { select: { userId: true } } },
  });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "TIMETABLE_EVENT_CREATED", entityType: "TimetableEvent", entityId: event.id } });
  return NextResponse.json({ event }, { status: 201 });
}
export async function PATCH(request: Request) {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = z.object({ id: z.string().cuid(), isActive: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid timetable update." }, { status: 400 });
  const event = await prisma.timetableEvent.update({ where: { id: parsed.data.id }, data: { isActive: parsed.data.isActive } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: parsed.data.isActive ? "TIMETABLE_EVENT_ACTIVATED" : "TIMETABLE_EVENT_CANCELLED", entityType: "TimetableEvent", entityId: event.id } });
  return NextResponse.json({ event });
}
