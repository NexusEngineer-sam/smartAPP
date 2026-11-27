import { NextResponse } from "next/server";
export async function GET() {
 const base=process.env.CAMPUS_API_URL;
 if(!base)return NextResponse.json({error:"Campus API haijaunganishwa."},{status:503});
 const r=await fetch(new URL("/api/data-center/push-key",base),{cache:"no-store"});
 const data=await r.json().catch(()=>({error:"Push unavailable"}));
 return NextResponse.json(data,{status:r.status});
}
