import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const schema=z.object({campaignId:z.string().cuid()});
export async function POST(request:Request){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const parsed=schema.safeParse(await request.json());
 if(!parsed.success)return NextResponse.json({error:"Invalid sponsored placement."},{status:400});
 const campaign=await prisma.adCampaign.findFirst({where:{id:parsed.data.campaignId,status:"APPROVED",OR:[{startsAt:null},{startsAt:{lte:new Date()}}],AND:[{OR:[{endsAt:null},{endsAt:{gte:new Date()}}]}]},select:{id:true}});
 if(!campaign)return NextResponse.json({error:"Campaign is not active."},{status:404});
 const now=new Date(),dayKey=now.toISOString().slice(0,10);
 const prior=await prisma.sponsoredAdView.findUnique({where:{campaignId_userId_dayKey:{campaignId:campaign.id,userId:user.id,dayKey}}});
 if(!prior){
  await prisma.sponsoredAdView.create({data:{campaignId:campaign.id,userId:user.id,dayKey}});
  return NextResponse.json({ok:true,secondsAdded:0});
 }
 const seconds=Math.max(0,Math.min(30,Math.floor((now.getTime()-prior.lastSeenAt.getTime())/1000)));
 if(seconds>=5)await prisma.sponsoredAdView.update({where:{id:prior.id},data:{visibleSeconds:{increment:seconds},lastSeenAt:now}});
 return NextResponse.json({ok:true,secondsAdded:seconds});
}
