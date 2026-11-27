import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const [classes, students, reps] = await Promise.all([
    prisma.campusClass.findMany({ orderBy: { name: "asc" }, include: { representative: { select: { id: true, name: true, email: true } }, members: { select: { id: true, name: true, email: true } } } }),
    prisma.user.findMany({ where: { isActive: true, role: "STUDENT" }, select: { id: true, name: true, email: true, classGroupId: true }, orderBy: { name: "asc" }, take: 500 }),
    prisma.user.findMany({ where: { isActive: true, role: "CLASS_REP" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" }, take: 200 })
  ]);
  return NextResponse.json({ classes, students, reps });
}

const schema = z.object({
  name: z.string().trim().min(3).max(120),
  representativeId: z.string().cuid(),
  memberIds: z.array(z.string().cuid()).max(500)
});

export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a class name, choose a CR and select students." }, { status: 400 });
  const { name, representativeId, memberIds } = parsed.data;
  const uniqueMembers = [...new Set(memberIds)];
  if (uniqueMembers.includes(representativeId)) return NextResponse.json({ error: "The CR cannot also be selected as a student member." }, { status: 400 });
  const [rep, validMembers, existing] = await Promise.all([
    prisma.user.findFirst({ where: { id: representativeId, role: "CLASS_REP", isActive: true }, select: { id: true } }),
    prisma.user.findMany({ where: { id: { in: uniqueMembers }, role: "STUDENT", isActive: true }, select: { id: true } }),
    prisma.campusClass.findUnique({ where: { name } })
  ]);
  if (!rep) return NextResponse.json({ error: "Choose an active account with the CLASS_REP role." }, { status: 400 });
  if (validMembers.length !== uniqueMembers.length) return NextResponse.json({ error: "One or more selected students are invalid or inactive." }, { status: 400 });
  if (existing) return NextResponse.json({ error: "A class with this name already exists." }, { status: 409 });
  try {
    const campusClass = await prisma.$transaction(async tx => {
      const created = await tx.campusClass.create({ data: { name, representativeId } });
      await tx.user.updateMany({ where: { id: { in: uniqueMembers } }, data: { classGroupId: created.id } });
      return tx.campusClass.findUnique({ where: { id: created.id }, include: { representative: { select: { id: true, name: true, email: true } }, members: { select: { id: true, name: true, email: true } } } });
    });
    await prisma.auditLog.create({ data: { actorId: admin.id, action: "CAMPUS_CLASS_CREATED", entityType: "CampusClass", entityId: campusClass!.id, metadata: { memberCount: uniqueMembers.length, representativeId } } });
    return NextResponse.json({ campusClass }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create class. Check whether this CR is already assigned to another class." }, { status: 409 });
  }
}