import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const profileSchema = z.object({
 country:z.string().trim().max(80).default(""),
 bio:z.string().trim().max(500).default(""),
 skills:z.array(z.string().trim().min(1).max(50)).max(15).default([]),
 interests:z.array(z.string().trim().min(1).max(50)).max(15).default([]),
 lookingFor:z.enum(["Study partner","Project partner","Research collaborator","Skill exchange","Startup co-founder","Mentor"]).default("Study partner")
});
async function buildMatches(userId:string) {
 const own=await prisma.globalStudentProfile.findUnique({where:{userId}});
 const others=await prisma.globalStudentProfile.findMany({
  where:{userId:{not:userId},OR:[{skills:{isEmpty:false}},{interests:{isEmpty:false}}]},
  include:{user:{select:{id:true,name:true,avatarUrl:true,university:true,course:true,isActive:true}}},
  take:150
 });
 const skills=new Set((own?.skills||[]).map(x=>x.toLowerCase()));
 const interests=new Set((own?.interests||[]).map(x=>x.toLowerCase()));
 return others.filter(x=>x.user.isActive).map(x=>{
  const sharedSkills=x.skills.filter(v=>skills.has(v.toLowerCase())).length;
  const sharedInterests=x.interests.filter(v=>interests.has(v.toLowerCase())).length;
  const score=Math.min(99,Math.round(35+sharedSkills*15+sharedInterests*12+(own?.lookingFor===x.lookingFor?8:0)+(own?.country.toLowerCase()===x.country.toLowerCase()?5:0)));
  return {id:x.user.id,name:x.user.name,avatarUrl:x.user.avatarUrl,university:x.user.university,course:x.user.course,country:x.country,bio:x.bio,skills:x.skills,interests:x.interests,lookingFor:x.lookingFor,score};
 }).sort((a,b)=>b.score-a.score).slice(0,30);
}
export async function GET() {
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Please sign in."},{status:401});
 const profile=await prisma.globalStudentProfile.findUnique({where:{userId:user.id}});
 return NextResponse.json({profile,matches:await buildMatches(user.id)});
}
export async function PUT(request:Request) {
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Please sign in."},{status:401});
 let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:"Invalid request."},{status:400});}
 const parsed=profileSchema.safeParse(body);
 if(!parsed.success)return NextResponse.json({error:"Check profile details and try again."},{status:400});
 const d=parsed.data;
 await prisma.globalStudentProfile.upsert({where:{userId:user.id},create:{userId:user.id,country:d.country||"Not specified",bio:d.bio,skills:d.skills,interests:d.interests,lookingFor:d.lookingFor},update:{country:d.country||"Not specified",bio:d.bio,skills:d.skills,interests:d.interests,lookingFor:d.lookingFor}});
 return NextResponse.json({success:true,matches:await buildMatches(user.id)});
}