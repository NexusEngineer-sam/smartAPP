import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
export async function GET(){
 const admin=await getCurrentUser();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator access required."},{status:403});
 const [users,totalStudents,totalAdmins]=await Promise.all([
  prisma.user.findMany({orderBy:{createdAt:"desc"},take:100,select:{id:true,name:true,email:true,role:true,isActive:true,createdAt:true}}),
  prisma.user.count({where:{role:"STUDENT"}}),prisma.user.count({where:{role:"ADMIN"}})
 ]);
 return NextResponse.json({users,metrics:{totalUsers:totalStudents+totalAdmins,totalStudents,totalAdmins}});
}
const schema=z.object({userId:z.string().cuid(),isActive:z.boolean()});
export async function PATCH(request:Request){
 const admin=await getCurrentUser();if(!admin||admin.role!=="ADMIN")return NextResponse.json({error:"Administrator access required."},{status:403});
 const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid user update."},{status:400});
 if(parsed.data.userId===admin.id)return NextResponse.json({error:"You cannot deactivate your own administrator account."},{status:400});
 const user=await prisma.user.update({where:{id:parsed.data.userId},data:{isActive:parsed.data.isActive},select:{id:true,name:true,isActive:true}});
 await prisma.auditLog.create({data:{actorId:admin.id,action:parsed.data.isActive?"USER_ACTIVATED":"USER_DEACTIVATED",entityType:"User",entityId:user.id}});
 return NextResponse.json({user});
}
