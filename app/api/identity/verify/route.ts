import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().min(32).max(128) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ valid: false, error: "Invalid or expired campus pass." }, { status: 400 });

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.identityToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { name: true, role: true, isActive: true } } },
  });

  if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now() || !record.user.isActive) {
    return NextResponse.json({ valid: false, error: "This campus pass is invalid, expired, or already used." }, { status: 404 });
  }

  const consumed = await prisma.identityToken.updateMany({
    where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (consumed.count !== 1) {
    return NextResponse.json({ valid: false, error: "This campus pass has already been used." }, { status: 409 });
  }

  return NextResponse.json({
    valid: true,
    identity: { name: record.user.name, role: record.user.role },
    verifiedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store, private" } });
}
