import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/),
  password: z.string().min(10).max(72),
});
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Tumia password yenye angalau herufi 10 na link sahihi." }, { status: 400 });
    const tokenHash = digest(parsed.data.token);
    const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!reset || reset.usedAt || reset.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Link hii si sahihi au muda wake umeisha. Omba link nyingine." }, { status: 400 });
    }
    const passwordHash = await hash(parsed.data.password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: reset.userId, id: { not: reset.id } } }),
      prisma.session.deleteMany({ where: { userId: reset.userId } }),
    ]);
    const response = NextResponse.json({ message: "Password imebadilishwa. Ingia kwa password yako mpya." });
    response.cookies.delete("campus_session");
    return response;
  } catch (error) {
    console.error("RESET_PASSWORD_API_ERROR", error);
    return NextResponse.json({ error: "Huduma haipatikani kwa sasa. Jaribu tena." }, { status: 500 });
  }
}
