import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Browser Resource Timing is an estimate, not carrier-level or CDN billing data.
const payloadSchema = z.object({
  bytes: z.number().int().positive().max(50 * 1024 * 1024),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid usage sample." }, { status: 400 });

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const today = await prisma.dataUsageEvent.aggregate({
    where: { userId: user.id, recordedAt: { gte: since } },
    _sum: { bytes: true },
  });
  const usedToday = Number(today._sum.bytes ?? BigInt(0));
  const dailyLimit = 500 * 1024 * 1024;
  const acceptedBytes = Math.min(parsed.data.bytes, Math.max(0, dailyLimit - usedToday));
  if (acceptedBytes <= 0) return NextResponse.json({ ok: true, acceptedBytes: 0 });

  await prisma.dataUsageEvent.create({
    data: { userId: user.id, bytes: BigInt(acceptedBytes), source: "CLIENT_ESTIMATE" },
  });
  return NextResponse.json({ ok: true, acceptedBytes });
}
