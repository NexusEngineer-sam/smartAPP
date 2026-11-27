import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const notifications=await prisma.notification.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:50});
 return NextResponse.json({notifications});
}
