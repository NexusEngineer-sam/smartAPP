import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request:Request) {
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const q=(new URL(request.url).searchParams.get("q")||"").trim().slice(0,80);
 const conversations=await prisma.chatConversation.findMany({
  where:{participants:{some:{userId:user.id}}},
  include:{participants:{include:{user:{select:{id:true,name:true,avatarUrl:true,university:true}}}},messages:{orderBy:{createdAt:"desc"},take:1}},
  orderBy:{updatedAt:"desc"},take:60
 });
 const users=q.length>=2?await prisma.user.findMany({
  where:{id:{not:user.id},isActive:true,OR:[{name:{contains:q,mode:"insensitive"}},{university:{contains:q,mode:"insensitive"}},{course:{contains:q,mode:"insensitive"}}]},
  select:{id:true,name:true,avatarUrl:true,university:true,course:true},take:15
 }):[];
 return NextResponse.json({conversations:conversations.map(c=>({...c,otherUsers:c.participants.filter(p=>p.userId!==user.id).map(p=>p.user),lastMessage:c.messages[0]||null})),users});
}
const createSchema=z.object({recipientId:z.string().min(1)});
export async function POST(request:Request) {
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const parsed=createSchema.safeParse(body);if(!parsed.success||parsed.data.recipientId===user.id)return NextResponse.json({error:"Choose another student."},{status:400});
 const recipient=await prisma.user.findFirst({where:{id:parsed.data.recipientId,isActive:true},select:{id:true}});
 if(!recipient)return NextResponse.json({error:"Student not found."},{status:404});
 const existing=await prisma.chatConversation.findFirst({where:{isGroup:false,AND:[{participants:{some:{userId:user.id}}},{participants:{some:{userId:recipient.id}}}],participants:{every:{userId:{in:[user.id,recipient.id]}}}},select:{id:true}});
 if(existing)return NextResponse.json({conversationId:existing.id});
 const conversation=await prisma.chatConversation.create({data:{createdById:user.id,participants:{create:[{userId:user.id},{userId:recipient.id}]}},select:{id:true}});
 return NextResponse.json({conversationId:conversation.id},{status:201});
}