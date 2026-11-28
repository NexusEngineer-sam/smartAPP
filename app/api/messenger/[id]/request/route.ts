import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Context={params:Promise<{id:string}>};
const schema=z.object({action:z.enum(["accept","decline"])});

export async function POST(request:Request,{params}:Context){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {id}=await params;
 let body:unknown;
 try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const parsed=schema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:"Choose accept or decline."},{status:400});
 const conversation=await prisma.chatConversation.findUnique({
  where:{id},
  include:{participants:{select:{userId:true,user:{select:{id:true,name:true,avatarUrl:true,university:true}}}}}
 });
 if(!conversation||!conversation.participants.some(p=>p.userId===user.id))return NextResponse.json({error:"Request not found."},{status:404});
 if(conversation.createdById===user.id)return NextResponse.json({error:"Only the recipient can respond to this request."},{status:403});
 if(conversation.requestStatus!=="PENDING")return NextResponse.json({error:"This request has already been handled."},{status:409});
 const updated=await prisma.chatConversation.updateMany({
  where:{id,requestStatus:"PENDING",createdById:{not:user.id}},
  data:{requestStatus:parsed.data.action==="accept"?"ACCEPTED":"DECLINED",updatedAt:new Date()}
 });
 if(!updated.count)return NextResponse.json({error:"This request has already been handled."},{status:409});
 return NextResponse.json({ok:true,status:parsed.data.action==="accept"?"ACCEPTED":"DECLINED"});
}
