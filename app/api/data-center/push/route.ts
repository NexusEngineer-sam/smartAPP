import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth";
import { getVapidConfig, sendPushToUser } from "@/lib/push";

const schema = z.object({ endpoint: z.string().url().max(3000), keys: z.object({ p256dh: z.string().min(20).max(500), auth: z.string().min(10).max(200) }) });
export async function POST(request: Request) {
  const header=request.headers.get("authorization")||"";
  const token=header.startsWith("Bearer ")?header.slice(7):"";
  if(!token)return NextResponse.json({error:"Admin login required."},{status:401});
  const session=await prisma.session.findUnique({where:{tokenHash:hashToken(token)},include:{user:true}});
  if(!session||session.expiresAt.getTime()<Date.now()||!session.user.isActive||session.user.role!=="ADMIN")return NextResponse.json({error:"Admin session expired."},{status:401});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid device subscription."},{status:400});
  const config=getVapidConfig();
  if(!config)return NextResponse.json({error:"Push keys are not configured on Campus OS."},{status:503});
  const {endpoint,keys}=parsed.data;
  await prisma.pushSubscription.upsert({where:{endpoint},create:{userId:session.userId,endpoint,p256dh:keys.p256dh,auth:keys.auth},update:{userId:session.userId,p256dh:keys.p256dh,auth:keys.auth}});
  await sendPushToUser(session.userId,"DATA CENTER connected","Phone alerts are now enabled for this device.","/");
  return NextResponse.json({ok:true});
}
