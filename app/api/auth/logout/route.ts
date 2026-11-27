import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, hashToken } from "@/lib/auth";

export async function POST(){
  const jar=await cookies();const token=jar.get(SESSION_COOKIE)?.value;
  if(token)await prisma.session.deleteMany({where:{tokenHash:hashToken(token)}});
  const response=NextResponse.json({ok:true});
  response.cookies.set(SESSION_COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0});
  return response;
}
