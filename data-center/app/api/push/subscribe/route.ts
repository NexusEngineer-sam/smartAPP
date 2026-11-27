import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function POST(request:Request) {
 const base=process.env.CAMPUS_API_URL;const token=(await cookies()).get("dc_session")?.value;
 if(!base||!token)return NextResponse.json({error:"Login required."},{status:401});
 const r=await fetch(new URL("/api/data-center/push",base),{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:await request.text(),cache:"no-store"});
 const data=await r.json().catch(()=>({error:"Push setup failed"}));
 return NextResponse.json(data,{status:r.status});
}
