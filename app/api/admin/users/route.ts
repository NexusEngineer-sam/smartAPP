import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const [users, totalStudents, totalLecturers, totalReps, totalAdmins] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "LECTURER" } }),
    prisma.user.count({ where: { role: "CLASS_REP" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);
  return NextResponse.json({ users, metrics: { totalUsers: totalStudents + totalLecturers + totalReps + totalAdmins, totalStudents, totalLecturers, totalReps, totalAdmins } });
}

const schema = z.object({
  userId: z.string().cuid(),
  isActive: z.boolean().optional(),
  role: z.enum(["STUDENT", "LECTURER", "CLASS_REP", "ADMIN"]).optional(),
}).refine(data => data.isActive !== undefined || data.role !== undefined, { message: "Provide an account status or role change." });

export async function PATCH(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid user update." }, { status: 400 });
  if (parsed.data.userId === admin.id && (parsed.data.isActive === false || (parsed.data.role && parsed.data.role !== "ADMIN"))) {
    return NextResponse.json({ error: "You cannot suspend or demote your own administrator account." }, { status: 400 });
  }
  const { userId, ...changes } = parsed.data;
  const user = await prisma.user.update({ where: { id: userId }, data: changes, select: { id: true, name: true, email: true, role: true, isActive: true } });
  const action = changes.role ? "USER_ROLE_CHANGED" : changes.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED";
  await prisma.auditLog.create({ data: { actorId: admin.id, action, entityType: "User", entityId: user.id, metadata: changes } });
  return NextResponse.json({ user });
}
