import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth";

const schema = z.object({ email: z.string().trim().email().max(190), password: z.string().min(1).max(72) });

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Weka email na password sahihi." }, { status: 400 });
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.role !== "ADMIN" || !(await compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Taarifa si sahihi au akaunti haina ruhusa ya admin." }, { status: 401 });
    }
    const token = randomBytes(48).toString("base64url");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    await prisma.session.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt } });
    return NextResponse.json({ token, expiresAt, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error("DATA_CENTER_LOGIN_ERROR", error);
    return NextResponse.json({ error: "Huduma ya login haipatikani kwa sasa." }, { status: 503 });
  }
}
