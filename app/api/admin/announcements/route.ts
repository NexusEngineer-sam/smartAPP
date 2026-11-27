import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToAll } from "@/lib/push";

async function adminOnly() {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
}
const schema = z.object({
  title: z.string().trim().min(3).max(140),
  body: z.string().trim().min(5).max(5000),
  published: z.boolean().default(false),
});

export async function GET() {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ announcements });
}
export async function POST(request: Request) {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Provide a title and announcement body." }, { status: 400 });
  const announcement = await prisma.announcement.create({ data: parsed.data });
  if (announcement.published) await sendPushToAll(announcement.title, announcement.body, "/#updates");
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "ANNOUNCEMENT_CREATED", entityType: "Announcement", entityId: announcement.id } });
  return NextResponse.json({ announcement }, { status: 201 });
}
export async function PATCH(request: Request) {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = z.object({ id: z.string().cuid(), ...schema.partial().shape }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid announcement update." }, { status: 400 });
  const { id, ...data } = parsed.data;
  const announcement = await prisma.announcement.update({ where: { id }, data });
  if (data.published === true) await sendPushToAll(announcement.title, announcement.body, "/#updates");
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "ANNOUNCEMENT_UPDATED", entityType: "Announcement", entityId: id } });
  return NextResponse.json({ announcement });
}
export async function DELETE(request: Request) {
  const admin = await adminOnly();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = z.object({ id: z.string().cuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid announcement ID." }, { status: 400 });
  await prisma.announcement.delete({ where: { id: parsed.data.id } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: "ANNOUNCEMENT_DELETED", entityType: "Announcement", entityId: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
