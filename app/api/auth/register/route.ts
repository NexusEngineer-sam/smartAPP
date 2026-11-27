import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema=z.object({name:z.string().trim().min(2).max(80),email:z.string().trim().email().max(190),password:z.string().min(10).max(72)});
export async function POST(request:Request){
  try{
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success)return NextResponse.json({error:"Check your name, email and password (minimum 10 characters)."}, {status:400});
    const {name,email,password}=parsed.data;
    const normalized=email.toLowerCase();
    if(await prisma.user.findUnique({where:{email:normalized}}))return NextResponse.json({error:"An account with this email already exists."},{status:409});
    const user=await prisma.user.create({data:{name,email:normalized,passwordHash:await hash(password,12),role:"STUDENT"}});
    await createSession(user.id);
    return NextResponse.json({user:{id:user.id,name:user.name,email:user.email,role:user.role}},{status:201});
  }catch{return NextResponse.json({error:"Registration could not be completed."},{status:500});}
}
