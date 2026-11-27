import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "SAMWEL CAMPUS OS", database: "connected" });
  } catch {
    return NextResponse.json({ ok: false, service: "SAMWEL CAMPUS OS", database: "unavailable" }, { status: 503 });
  }
}
