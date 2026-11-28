import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({
  email: z.string().trim().email().max(190),
  recoveryKey: z.string().min(32).max(256),
  password: z.string().min(12).max(72),
});
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Jaza taarifa zote. Password iwe na angalau herufi 12." }, { status: 400 });
    }

    const configuredKey = process.env.ADMIN_RECOVERY_KEY;
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!configuredKey || !adminEmail) {
      return NextResponse.json({ error: "Huduma ya kurejesha admin haijawezeshwa." }, { status: 503 });
    }

    const supplied = Buffer.from(parsed.data.recoveryKey);
    const expected = Buffer.from(configuredKey);
    const keyMatches = supplied.length === expected.length && timingSafeEqual(supplied, expected);
    const email = parsed.data.email.toLowerCase();
    if (!keyMatches || email !== adminEmail) {
      return NextResponse.json({ error: "Recovery details si sahihi." }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, isActive: true } });
    if (!user?.isActive) {
      return NextResponse.json({ error: "Akaunti ya admin haipatikani au imezimwa." }, { status: 404 });
    }

    // A unique, consumed token record makes this recovery key single-use.
    const tokenHash = digest(configuredKey);
    if (await prisma.passwordResetToken.findUnique({ where: { tokenHash }, select: { id: true } })) {
      return NextResponse.json({ error: "Recovery key hii tayari imetumika. Wasiliana na mwenyeji wa mfumo ili itengenezwe nyingine." }, { status: 410 });
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const now = new Date();
    await prisma.$transaction([
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), usedAt: now },
      }),
      prisma.user.update({ where: { id: user.id }, data: { passwordHash, role: "ADMIN" } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    ]);

    return NextResponse.json({ message: "Password mpya imewekwa. Sasa ingia kwa password mpya." });
  } catch (error) {
    console.error("ADMIN_PASSWORD_RECOVERY_ERROR", error);
    return NextResponse.json({ error: "Imeshindikana kuweka password. Jaribu tena." }, { status: 500 });
  }
}
