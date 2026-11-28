import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia kwanza." }, { status: 401 });
  try { await prisma.googleDriveBackupConnection.deleteMany({ where: { userId: user.id } }); return NextResponse.json({ success: true }); }
  catch { return NextResponse.json({ error: "Imeshindikana kuondoa Google Drive." }, { status: 500 }); }
}
