import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const expenses=await prisma.expense.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:100});
 return NextResponse.json({expenses});
}
const schema=z.object({title:z.string().trim().min(2).max(100),amount:z.number().int().positive().max(100000000),category:z.enum(["Food","Transport","Study","Shopping","Accommodation","Other"])});
export async function POST(request:Request){
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Enter a valid description, amount and category."},{status:400});
 const expense=await prisma.expense.create({data:{...parsed.data,userId:user.id}});
 return NextResponse.json({expense},{status:201});
}
