import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

async function getMessenger(request:Request) {
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
 const people=[...new Set([...conversations.flatMap(c=>c.participants.filter(p=>p.userId!==user.id).map(p=>p.userId)),...users.map(p=>p.id)])];
 const cutoff=new Date(Date.now()-75_000);
 const activity=people.length?await prisma.engagementSession.findMany({
  where:{userId:{in:people}},
  select:{userId:true,lastSeenAt:true,endedAt:true},orderBy:{lastSeenAt:"desc"},take:500
 }):[];
 const presence=new Map<string,{lastSeenAt:string;online:boolean}>();
 for(const item of activity)if(!presence.has(item.userId))presence.set(item.userId,{
  lastSeenAt:item.lastSeenAt.toISOString(),
  online:!item.endedAt&&item.lastSeenAt.getTime()>=cutoff.getTime()
 });
 const withPresence=(person:{id:string;name:string;avatarUrl:string|null;university?:string|null;course?:string|null})=>{
  const state=presence.get(person.id);
  return {...person,online:state?.online||false,lastSeenAt:state?.lastSeenAt||null};
 };
 return NextResponse.json({
  conversations:conversations.filter(c=>c.requestStatus==="ACCEPTED").map(c=>({...c,otherUsers:c.participants.filter(p=>p.userId!==user.id).map(p=>withPresence(p.user)),lastMessage:c.messages[0]||null})),
  incomingRequests:conversations.filter(c=>c.requestStatus==="PENDING"&&c.createdById!==user.id).map(c=>({...c,otherUsers:c.participants.filter(p=>p.userId!==user.id).map(p=>withPresence(p.user)),lastMessage:c.messages[0]||null})),
  outgoingRequests:conversations.filter(c=>c.requestStatus==="PENDING"&&c.createdById===user.id).map(c=>({...c,otherUsers:c.participants.filter(p=>p.userId!==user.id).map(p=>withPresence(p.user)),lastMessage:c.messages[0]||null})),
  users:users.map(withPresence)
 });
}
const createSchema=z.object({recipientId:z.string().min(1)});
async function createMessengerRequest(request:Request) {
 const user=await getCurrentUser(); if(!user)return NextResponse.json({error:"Sign in required."},{status:401});
 let body:unknown;try{body=await request.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 const parsed=createSchema.safeParse(body);if(!parsed.success||parsed.data.recipientId===user.id)return NextResponse.json({error:"Choose another student."},{status:400});
 const recipient=await prisma.user.findFirst({where:{id:parsed.data.recipientId,isActive:true},select:{id:true}});
 if(!recipient)return NextResponse.json({error:"Student not found."},{status:404});
 const existing=await prisma.chatConversation.findFirst({where:{isGroup:false,AND:[{participants:{some:{userId:user.id}}},{participants:{some:{userId:recipient.id}}}],participants:{every:{userId:{in:[user.id,recipient.id]}}}},select:{id:true}});
 if(existing){
  const conversation=await prisma.chatConversation.findUnique({where:{id:existing.id},select:{id:true,requestStatus:true,createdById:true}});
  if(conversation?.requestStatus==="DECLINED")return NextResponse.json({error:"This student declined your previous request."},{status:403});
  return NextResponse.json({conversationId:existing.id,requestStatus:conversation?.requestStatus||"ACCEPTED",pending:conversation?.requestStatus==="PENDING"});
 }
 const conversation=await prisma.chatConversation.create({data:{createdById:user.id,requestStatus:"PENDING",participants:{create:[{userId:user.id},{userId:recipient.id}]}},select:{id:true}});
 return NextResponse.json({conversationId:conversation.id,requestStatus:"PENDING",pending:true},{status:201});
}
export async function GET(request:Request){try{return await getMessenger(request)}catch(error){console.error("[messenger:GET]",error);return NextResponse.json({error:"Messenger imeshindwa kupakia mazungumzo. Jaribu tena."},{status:500})}}
export async function POST(request:Request){try{return await createMessengerRequest(request)}catch(error){console.error("[messenger:POST]",error);return NextResponse.json({error:"Ombi la ujumbe halijafanikiwa. Jaribu tena."},{status:500})}}
