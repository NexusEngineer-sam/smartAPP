import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" }, take: 100,
    include: { actor: { select: { name: true, email: true } } },
  });
  return NextResponse.json({ logs });
}
