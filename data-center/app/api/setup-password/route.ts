import { NextResponse } from "next/server";
export async function POST(request: Request) {
  const base = process.env.CAMPUS_API_URL;
  if (!base) return NextResponse.json({ error: "Campus API haijaunganishwa." }, { status: 503 });
  try {
    const response = await fetch(new URL("/api/data-center/auth/setup-password", base), { method: "POST", headers: { "content-type": "application/json" }, body: await request.text(), cache: "no-store" });
    const data = await response.json().catch(() => ({ error: "Password setup failed." }));
    return NextResponse.json(data, { status: response.status });
  } catch { return NextResponse.json({ error: "Campus API haipatikani kwa sasa." }, { status: 503 }); }
}
