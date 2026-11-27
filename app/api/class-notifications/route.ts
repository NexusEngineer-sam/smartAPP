import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
import { notifyDataCenterAdmins } from "@/lib/data-center-alerts";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const current = await prisma.user.findUnique({ where: { id: user.id }, include: { representedClass: true, classGroup: true } });
  if (!current) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  if (current.role === "CLASS_REP") {
    if (!current.representedClass) return NextResponse.json({ className: null, messages: [], memberCount: 0 });
    const [messages, memberCount] = await Promise.all([
      prisma.classMessage.findMany({ where: { classId: current.representedClass.id, senderId: current.id }, orderBy: { createdAt: "desc" }, take: 30 }),
      prisma.user.count({ where: { classGroupId: current.representedClass.id, role: "STUDENT", isActive: true } })
    ]);
    return NextResponse.json({ className: current.representedClass.name, messages, memberCount });
  }
  if (!current.classGroup) return NextResponse.json({ className: null, messages: [] });
  const messages = await prisma.classMessage.findMany({ where: { classId: current.classGroup.id }, orderBy: { createdAt: "desc" }, take: 30, select: { id: true, title: true, body: true, createdAt: true, sender: { select: { name: true } } } });
  return NextResponse.json({ className: current.classGroup.name, messages });
}

const messageSchema = z.object({ title: z.string().trim().min(3).max(120), body: z.string().trim().min(5).max(2000) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "CLASS_REP") return NextResponse.json({ error: "Class representative access required." }, { status: 403 });
  const parsed = messageSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a title and message (at least 5 characters)." }, { status: 400 });
  const rep = await prisma.user.findUnique({ where: { id: user.id }, include: { representedClass: true } });
  if (!rep?.representedClass) return NextResponse.json({ error: "You have not been assigned to a class. Contact the administrator." }, { status: 403 });
  const members = await prisma.user.findMany({ where: { classGroupId: rep.representedClass.id, role: "STUDENT", isActive: true }, select: { id: true } });
  if (!members.length) return NextResponse.json({ error: "Your class has no active student members yet." }, { status: 400 });
  const message = await prisma.classMessage.create({ data: { classId: rep.representedClass.id, senderId: rep.id, ...parsed.data } });
  const now = new Date();
  await prisma.notification.createMany({ data: members.map(member => ({ userId: member.id, title: parsed.data.title, body: parsed.data.body, channel: "CLASS", status: "SENT", dedupeKey: randomUUID(), sentAt: now })) });
  const pushResults = await Promise.all(members.map(member => sendPushToUser(member.id, parsed.data.title, parsed.data.body, "/#updates")));
  await prisma.auditLog.create({ data: { actorId: rep.id, action: "CLASS_NOTIFICATION_SENT", entityType: "ClassMessage", entityId: message.id, metadata: { classId: rep.representedClass.id, recipientCount: members.length } } });
  await notifyDataCenterAdmins("Class notification sent", `${rep.name} sent an update to ${rep.representedClass.name}.`, "/");
  return NextResponse.json({ message, recipientCount: members.length, pushSent: pushResults.reduce((sum, result) => sum + result.sent, 0) }, { status: 201 });
}