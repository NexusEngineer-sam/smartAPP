import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema=z.object({action:z.enum(["start","ping","end"]),sessionKey:z.string().min(20).max(100),pagePath:z.string().max(300).optional()});

export async function POST(request:Request){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const parsed=schema.safeParse(await request.json());
 if(!parsed.success)return NextResponse.json({error:"Invalid engagement event."},{status:400});
 const {action,sessionKey,pagePath}=parsed.data;
 if(action==="start"){
  await prisma.engagementSession.upsert({where:{sessionKey},create:{sessionKey,userId:user.id,pagePath:pagePath||"/"},update:{userId:user.id,pagePath:pagePath||"/",startedAt:new Date(),lastSeenAt:new Date(),endedAt:null,durationSeconds:0}});
  return NextResponse.json({ok:true});
 }
 const session=await prisma.engagementSession.findUnique({where:{sessionKey}});
 if(!session||session.userId!==user.id)return NextResponse.json({error:"Session not found."},{status:404});
 if(session.endedAt)return NextResponse.json({ok:true,durationSeconds:session.durationSeconds});
 const now=new Date();
 const elapsed=Math.max(0,Math.min(45,Math.floor((now.getTime()-session.lastSeenAt.getTime())/1000)));
 if(action==="ping"){
  if(elapsed>=5)await prisma.engagementSession.update({where:{id:session.id},data:{durationSeconds:{increment:elapsed},lastSeenAt:now,pagePath:pagePath||session.pagePath}});
  return NextResponse.json({ok:true});
 }
 await prisma.engagementSession.update({where:{id:session.id},data:{durationSeconds:{increment:elapsed},lastSeenAt:now,endedAt:now}});
 return NextResponse.json({ok:true});
}

export async function GET(){
 const user=await getCurrentUser();
 if(user?.role!=="ADMIN")return NextResponse.json({error:"Administrator access required."},{status:403});
 const since=new Date();since.setDate(since.getDate()-30);
 const [sessions,users,views,topPages]=await Promise.all([
  prisma.engagementSession.aggregate({where:{startedAt:{gte:since}},_count:{_all:true},_sum:{durationSeconds:true}}),
  prisma.engagementSession.findMany({where:{startedAt:{gte:since}},distinct:["userId"],select:{userId:true}}),
  prisma.sponsoredAdView.aggregate({where:{firstSeenAt:{gte:since}},_count:{_all:true},_sum:{visibleSeconds:true}}),
  prisma.engagementSession.groupBy({by:["pagePath"],where:{startedAt:{gte:since}},_sum:{durationSeconds:true},_count:{_all:true},orderBy:{_sum:{durationSeconds:"desc"}},take:5})
 ]);
 return NextResponse.json({periodDays:30,sessions:sessions._count._all,uniqueUsers:users.length,totalWatchSeconds:sessions._sum.durationSeconds||0,sponsoredViews:views._count._all,sponsoredVisibleSeconds:views._sum.visibleSeconds||0,topPages});
}
