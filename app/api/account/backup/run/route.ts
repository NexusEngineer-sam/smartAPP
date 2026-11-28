import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { POST as createBackup } from "../route";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const secret = process.env.CAMPUS_BACKUP_CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const due = await prisma.googleDriveBackupConnection.findMany({
    where: { nextBackupAt: { lte: new Date() } },
    select: { userId: true },
    take: 20,
    orderBy: { nextBackupAt: "asc" },
  });

  const results: Array<{ userId: string; success: boolean; error?: string }> = [];
  for (const item of due) {
    const internalRequest = new NextRequest("https://internal.local/api/account/backup", {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ userId: item.userId }),
    });
    try {
      const response = await createBackup(internalRequest);
      const data = await response.json();
      results.push({ userId: item.userId, success: response.ok, ...(response.ok ? {} : { error: data.error || "Backup failed" }) });
    } catch (error) {
      results.push({ userId: item.userId, success: false, error: error instanceof Error ? error.message : "Backup failed" });
    }
  }

  return NextResponse.json({ processed: results.length, succeeded: results.filter(x => x.success).length, failed: results.filter(x => !x.success).length, results });
}
