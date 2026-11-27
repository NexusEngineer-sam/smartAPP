import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const sections=["survival","housing","deals","study","wallet","growth","profile","settings"] as const;
const createSchema=z.object({
 section:z.enum(sections),
 title:z.string().trim().min(1).max(140),
 detail:z.string().trim().max(500).optional().nullable(),
 amount:z.number().int().min(0).max(100000000).optional().nullable(),
});
export async function GET(){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const items=await prisma.studentLifeItem.findMany({where:{userId:user.id},orderBy:{createdAt:"desc"},take:500});
 return NextResponse.json({items});
}
export async function POST(request:Request){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const parsed=createSchema.safeParse(await request.json());
 if(!parsed.success)return NextResponse.json({error:"Invalid student life entry."},{status:400});
 if(parsed.data.section==="settings")await prisma.studentLifeItem.deleteMany({where:{userId:user.id,section:"settings"}});\n const item=await prisma.studentLifeItem.create({data:{...parsed.data,userId:user.id,detail:parsed.data.detail||null,amount:parsed.data.amount??null}});
 return NextResponse.json({item},{status:201});
}
const patchSchema=z.object({id:z.string().min(1),done:z.boolean()});
export async function PATCH(request:Request){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const parsed=patchSchema.safeParse(await request.json());
 if(!parsed.success)return NextResponse.json({error:"Invalid update."},{status:400});
 const result=await prisma.studentLifeItem.updateMany({where:{id:parsed.data.id,userId:user.id,section:"growth"},data:{done:parsed.data.done}});
 if(!result.count)return NextResponse.json({error:"Entry not found."},{status:404});
 return NextResponse.json({ok:true});
}
const deleteSchema=z.object({id:z.string().min(1)});
export async function DELETE(request:Request){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
 const parsed=deleteSchema.safeParse(await request.json());
 if(!parsed.success)return NextResponse.json({error:"Invalid entry."},{status:400});
 const result=await prisma.studentLifeItem.deleteMany({where:{id:parsed.data.id,userId:user.id}});
 if(!result.count)return NextResponse.json({error:"Entry not found."},{status:404});
 return NextResponse.json({ok:true});
}
