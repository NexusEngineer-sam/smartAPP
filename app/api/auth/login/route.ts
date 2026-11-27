import { NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema=z.object({email:z.string().email().max(190),password:z.string().min(1).max(72)});
export async function POST(request:Request){
  const parsed=schema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({error:"Invalid email or password."},{status:400});
  const user=await prisma.user.findUnique({where:{email:parsed.data.email.toLowerCase()}});
  if(!user||!user.isActive||!await compare(parsed.data.password,user.passwordHash))return NextResponse.json({error:"Invalid email or password."},{status:401});
  await createSession(user.id);
  return NextResponse.json({user:{id:user.id,name:user.name,email:user.email,role:user.role}});
}
