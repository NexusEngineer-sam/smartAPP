import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";
type Context={params:Promise<{id:string}>};
async function getMessages(request:Request,{params}:Context){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {id}=await params;
 const member=await prisma.chatParticipant.findUnique({where:{conversationId_userId:{conversationId:id,userId:user.id}}});
 if(!member)return NextResponse.json({error:"Conversation not found."},{status:404});
 const conversation=await prisma.chatConversation.findUnique({where:{id},include:{participants:{select:{userId:true}}}});
 if(!conversation||conversation.isGroup||conversation.participants.length!==2||!conversation.participants.some(p=>p.userId===user.id))return NextResponse.json({error:"This is not a valid private conversation."},{status:404});
 if(conversation.requestStatus!=="ACCEPTED")return NextResponse.json({error:"This message request has not been accepted yet."},{status:403});
 const beforeId=new URL(request.url).searchParams.get("beforeId");
 let cursor: {id:string}|undefined;
 if(beforeId){
  const anchor=await prisma.chatMessage.findFirst({where:{id:beforeId,conversationId:id},select:{id:true}});
  if(!anchor)return NextResponse.json({error:"Message history cursor not found."},{status:404});
  cursor={id:anchor.id};
 }
 const batch=await prisma.chatMessage.findMany({
  where:{conversationId:id},
  ...(cursor?{cursor,skip:1}:{}),
  include:{sender:{select:{id:true,name:true,avatarUrl:true}}},
  orderBy:{createdAt:"desc"},take:101
 });
 const hasMore=batch.length>100;
 const messages=batch.slice(0,100).reverse();
 await prisma.chatParticipant.update({where:{id:member.id},data:{lastReadAt:new Date()}});
 const peer=await prisma.chatParticipant.findFirst({where:{conversationId:id,userId:{not:user.id}},select:{lastReadAt:true}});
 return NextResponse.json({messages,hasMore,peerReadAt:peer?.lastReadAt?.toISOString()||null});
}
const schema=z.object({body:z.string().trim().min(1).max(4000)});
async function createMessage(request:Request,{params}:Context){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 const {id}=await params;
 const member=await prisma.chatParticipant.findUnique({where:{conversationId_userId:{conversationId:id,userId:user.id}}});
 if(!member)return NextResponse.json({error:"Conversation not found."},{status:404});
 const conversation=await prisma.chatConversation.findUnique({where:{id},include:{participants:{select:{userId:true}}}});
 if(!conversation||conversation.isGroup||conversation.participants.length!==2||!conversation.participants.some(p=>p.userId===user.id))return NextResponse.json({error:"This is not a valid private conversation."},{status:404});
 if(conversation.requestStatus!=="ACCEPTED")return NextResponse.json({error:"Wait until the student accepts your message request."},{status:403});
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:"Message must contain 1–4000 characters."},{status:400});
 const message=await prisma.chatMessage.create({data:{conversationId:id,senderId:user.id,body:parsed.data.body},include:{sender:{select:{id:true,name:true,avatarUrl:true}}}});
 await prisma.chatConversation.update({where:{id},data:{updatedAt:new Date()}});
 const recipient=conversation.participants.find(p=>p.userId!==user.id);
 if(recipient){
  const preview=parsed.data.body.length>120?parsed.data.body.slice(0,117)+"…":parsed.data.body;
  void sendPushToUser(recipient.userId,`Ujumbe mpya kutoka ${user.name}`,preview,"/").catch(error=>console.error("[messenger:push]",error));
 }
 return NextResponse.json({message},{status:201});
}
export async function GET(request:Request,context:Context){try{return await getMessages(request,context)}catch(error){console.error("[messenger:messages:GET]",error);return NextResponse.json({error:"Ujumbe haukuweza kupakiwa. Jaribu tena."},{status:500})}}
export async function POST(request:Request,context:Context){try{return await createMessage(request,context)}catch(error){console.error("[messenger:messages:POST]",error);return NextResponse.json({error:"Ujumbe haukutumwa. Jaribu tena."},{status:500})}}
