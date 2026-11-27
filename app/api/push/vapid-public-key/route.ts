import { NextResponse } from "next/server";
import { getVapidConfig } from "@/lib/push";

export const dynamic = "force-dynamic";

export async function GET() {
  const vapid = getVapidConfig();
  if (!vapid) return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  return NextResponse.json({ publicKey: vapid.publicKey }, { headers: { "Cache-Control": "no-store" } });
}
