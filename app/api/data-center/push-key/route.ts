import { NextResponse } from "next/server";
import { getVapidConfig } from "@/lib/push";
export async function GET() {
  const config = getVapidConfig();
  if (!config) return NextResponse.json({ error: "Push notifications are not configured on Campus OS." }, { status: 503 });
  return NextResponse.json({ publicKey: config.publicKey }, { headers: { "Cache-Control": "no-store" } });
}
