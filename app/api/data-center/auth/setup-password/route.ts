import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
const schema = z.object({ key: z.string().min(32).max(256), email: z.string().trim().email().max(190), password: z.string().min(10).max(72) });
export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Weka email na password yenye angalau herufi 10." }, { status: 400 });
    const expected = process.env.DATA_CENTER_SETUP_KEY || "";
    const expiresAt = Number(process.env.DATA_CENTER_SETUP_EXPIRES_AT || 0);
    const supplied = Buffer.from(parsed.data.key);
    const configured = Buffer.from(expected);
    if (!expected || !Number.isFinite(expiresAt) || Date.now() > expiresAt || supplied.length !== configured.length || !timingSafeEqual(supplied, configured)) return NextResponse.json({ error: "Kiungo cha kuweka password kimeisha muda au si sahihi. Omba kiungo kipya." }, { status: 403 });
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.role !== "ADMIN") return NextResponse.json({ error: "Email hii haijaunganishwa na akaunti hai ya ADMIN." }, { status: 404 });
    const passwordHash = await hash(parsed.data.password, 12);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ ok: true, message: "Password mpya imewekwa. Sasa unaweza kuingia." });
  } catch (error) {
    console.error("DATA_CENTER_PASSWORD_SETUP_ERROR", error);
    return NextResponse.json({ error: "Imeshindikana kuweka password kwa sasa." }, { status: 503 });
  }
}
