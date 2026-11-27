import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function POST() {
  const base=process.env.CAMPUS_API_URL;
  const jar=await cookies();
  const token=jar.get("dc_session")?.value;
  if(base&&token) await fetch(new URL("/api/data-center/auth/logout",base),{method:"POST",headers:{authorization:`Bearer ${token}`},cache:"no-store"}).catch(()=>undefined);
  jar.set("dc_session","",{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:0});
  return NextResponse.json({ok:true});
}
