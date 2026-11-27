import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const announcements=await prisma.announcement.findMany({where:{published:true},orderBy:{createdAt:"desc"},take:10,select:{id:true,title:true,body:true,createdAt:true}});
 return NextResponse.json({announcements});
}
