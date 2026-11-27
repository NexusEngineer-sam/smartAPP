import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  if (!user.isActive) return NextResponse.json({ error: "Account is inactive." }, { status: 403 });

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 90_000);

  await prisma.$transaction([
    prisma.identityToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.identityToken.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    }),
  ]);

  return NextResponse.json({
    token,
    expiresAt: expiresAt.toISOString(),
    identity: { name: user.name, role: user.role },
  }, { headers: { "Cache-Control": "no-store, private" } });
}
