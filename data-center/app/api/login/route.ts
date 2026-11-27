import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function POST(request: Request) {
  const base = process.env.CAMPUS_API_URL;
  if (!base) return NextResponse.json({error:"Campus API haijaunganishwa."},{status:503});
  const response = await fetch(new URL("/api/data-center/auth/login", base), { method:"POST", headers:{"content-type":"application/json"}, body:await request.text(), cache:"no-store" });
  const data = await response.json().catch(()=>({error:"Login failed"}));
  if (!response.ok) return NextResponse.json(data,{status:response.status});
  const jar = await cookies();
  jar.set("dc_session", data.token, { httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge:60*60*24*7 });
  return NextResponse.json({user:data.user});
}
