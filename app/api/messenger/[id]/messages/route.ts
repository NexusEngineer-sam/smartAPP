import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {id}=await params;
 const member=await prisma.chatParticipant.findUnique({where:{conversationId_userId:{conversationId:id,userId:user.id}}});
 if(!member)return NextResponse.json({error:"Conversation not found."},{status:404});
 const conversation=await prisma.chatConversation.findUnique({where:{id},select:{requestStatus:true}});
 if(conversation?.requestStatus!=="ACCEPTED")return NextResponse.json({error:"This message request has not been accepted yet."},{status:403});
 const messages=await prisma.chatMessage.findMany({where:{conversationId:id},include:{sender:{select:{id:true,name:true,avatarUrl:true}}},orderBy:{createdAt:"asc"},take:100});
 await prisma.chatParticipant.update({where:{id:member.id},data:{lastReadAt:new Date()}});
 const peer=await prisma.chatParticipant.findFirst({where:{conversationId:id,userId:{not:user.id}},select:{lastReadAt:true}});
 return NextResponse.json({messages,peerReadAt:peer?.lastReadAt?.toISOString()||null});
}
const schema=z.object({body:z.string().trim().min(1).max(4000)});
export async function POST(request:Request,{params}:Context){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {id}=await params;
 const member=await prisma.chatParticipant.findUnique({where:{conversationId_userId:{conversationId:id,userId:user.id}}});
 if(!member)return NextResponse.json({error:"Conversation not found."},{status:404});
 const conversation=await prisma.chatConversation.findUnique({where:{id},select:{requestStatus:true}});
 if(conversation?.requestStatus!=="ACCEPTED")return NextResponse.json({error:"Wait until the student accepts your message request."},{status:403});
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"Message must contain 1–4000 characters."},{status:400});
 const message=await prisma.chatMessage.create({data:{conversationId:id,senderId:user.id,body:parsed.data.body},include:{sender:{select:{id:true,name:true,avatarUrl:true}}}});
 await prisma.chatConversation.update({where:{id},data:{updatedAt:new Date()}});
 return NextResponse.json({message},{status:201});
}