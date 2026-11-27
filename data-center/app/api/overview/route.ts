import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function GET() {
  const base = process.env.CAMPUS_API_URL;
  const token = (await cookies()).get("dc_session")?.value;
  if (!base || !token) return NextResponse.json({error:"Login required."},{status:401});
  const response = await fetch(new URL("/api/data-center/overview",base),{headers:{authorization:`Bearer ${token}`},cache:"no-store"});
  const data = await response.json().catch(()=>({error:"Could not load dashboard"}));
  return NextResponse.json(data,{status:response.status});
}
