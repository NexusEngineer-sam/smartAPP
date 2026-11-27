import { createHash,randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE="campus_session";
export const hashToken=(token:string)=>createHash("sha256").update(token).digest("hex");

export async function createSession(userId:string){
 const token=randomBytes(32).toString("base64url");
 const expiresAt=new Date(Date.now()+1000*60*60*24*14);
 await prisma.session.create({data:{userId,tokenHash:hashToken(token),expiresAt}});
 const jar=await cookies();
 jar.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});
}

export async function getCurrentUser(){
 const jar=await cookies();const token=jar.get(SESSION_COOKIE)?.value;if(!token)return null;
 const session=await prisma.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:true}});
 if(!session)return null;
 if(session.expiresAt<Date.now()||!session.user.isActive){await prisma.session.delete({where:{id:session.id}});return null;}
 return session.user;
}
