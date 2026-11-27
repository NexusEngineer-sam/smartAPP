import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const kinds = ["CLASS", "STUDY", "ASSIGNMENT", "EXAM"] as const;
const schema = z.object({
  kind: z.enum(kinds),
  title: z.string().trim().min(2).max(140),
  courseCode: z.string().trim().max(40).optional().nullable(),
  location: z.string().trim().max(140).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional().nullable(),
  reminderMins: z.number().int().min(0).max(1440).default(15),
  repeatWeekly: z.boolean().default(false),
});
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia tena." }, { status: 401 });
  const items = await prisma.personalSchedule.findMany({
    where: { userId: user.id, OR: [{ startsAt: { gte: new Date(Date.now() - 7 * 86400000) } }, { repeatWeekly: true }] },
    orderBy: { startsAt: "asc" }, take: 200,
  });
  return NextResponse.json({ items });
}
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia tena." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Taarifa si sahihi." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Jaza taarifa zote zinazohitajika kwa usahihi." }, { status: 400 });
  const startsAt = new Date(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  if (endsAt && endsAt <= startsAt) return NextResponse.json({ error: "Muda wa kumaliza lazima uwe baada ya muda wa kuanza." }, { status: 400 });
  const item = await prisma.personalSchedule.create({ data: {
    userId: user.id, kind: parsed.data.kind, title: parsed.data.title,
    courseCode: parsed.data.courseCode || null, location: parsed.data.location || null,
    startsAt, endsAt, reminderMins: parsed.data.reminderMins, repeatWeekly: parsed.data.repeatWeekly,
  }});
  return NextResponse.json({ item }, { status: 201 });
}
const updateSchema = z.object({ id: z.string().min(1), done: z.boolean() });
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia tena." }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Taarifa si sahihi." }, { status: 400 });
  const result = await prisma.personalSchedule.updateMany({ where: { id: parsed.data.id, userId: user.id }, data: { done: parsed.data.done } });
  if (!result.count) return NextResponse.json({ error: "Ratiba haijapatikana." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
const deleteSchema = z.object({ id: z.string().min(1) });
export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia tena." }, { status: 401 });
  const parsed = deleteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Taarifa si sahihi." }, { status: 400 });
  const result = await prisma.personalSchedule.deleteMany({ where: { id: parsed.data.id, userId: user.id } });
  if (!result.count) return NextResponse.json({ error: "Ratiba haijapatikana." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
