import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
const prisma=new PrismaClient();
async function main(){
 const email=process.env.ADMIN_EMAIL?.toLowerCase();
 const password=process.env.ADMIN_PASSWORD;
 const name=process.env.ADMIN_NAME||"System Administrator";
 if(!email||!password||password.length<12)throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (minimum 12 characters) before seeding.");
 await prisma.user.upsert({where:{email},update:{},create:{name,email,passwordHash:await hash(password,12),role:"ADMIN"}});
 console.log("Initial administrator is ready:",email);
}
main().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
