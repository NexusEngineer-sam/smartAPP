import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [usage, usageSources, confirmed, pending, reversed, recentEntries, campaigns] = await Promise.all([
    prisma.dataUsageEvent.aggregate({
      where: { recordedAt: { gte: since } },
      _sum: { bytes: true },
      _count: { _all: true },
    }),
    prisma.dataUsageEvent.groupBy({
      by: ["source"],
      where: { recordedAt: { gte: since } },
      _sum: { bytes: true },
      _count: { _all: true },
    }),
    prisma.revenueLedgerEntry.aggregate({
      where: { status: "CONFIRMED", confirmedAt: { gte: since } },
      _sum: { amountTzs: true },
      _count: { _all: true },
    }),
    prisma.revenueLedgerEntry.aggregate({
      where: { status: "PENDING" },
      _sum: { amountTzs: true },
      _count: { _all: true },
    }),
    prisma.revenueLedgerEntry.aggregate({
      where: { status: "REVERSED", createdAt: { gte: since } },
      _sum: { amountTzs: true },
      _count: { _all: true },
    }),
    prisma.revenueLedgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, source: true, description: true, amountTzs: true, status: true, createdAt: true, confirmedAt: true },
    }),
    prisma.adCampaign.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { budgetTzs: true },
    }),
  ]);

  const bytes = usage._sum.bytes ?? BigInt(0);
  return NextResponse.json({
    periodDays: 30,
    usage: {
      totalBytes: bytes.toString(),
      totalGiB: Number(bytes) / (1024 ** 3),
      eventCount: usage._count._all,
      sources: usageSources.map((item) => ({
        source: item.source,
        bytes: (item._sum.bytes ?? BigInt(0)).toString(),
        events: item._count._all,
      })),
      note: "Usage telemetry is analytics only. It is not cash revenue and must not be priced as income.",
    },
    revenue: {
      confirmedTzs: confirmed._sum.amountTzs ?? 0,
      confirmedEntries: confirmed._count._all,
      pendingTzs: pending._sum.amountTzs ?? 0,
      pendingEntries: pending._count._all,
      reversedTzs: reversed._sum.amountTzs ?? 0,
    },
    campaigns: campaigns.map((item) => ({
      status: item.status,
      count: item._count._all,
      declaredBudgetTzs: item._sum.budgetTzs ?? 0,
    })),
    recentEntries,
  });
}
