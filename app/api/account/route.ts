import { NextResponse } from "next/server";
import { z } from "zod";
import { compare, hash } from "bcryptjs";
import { getCurrentUser, hashToken, SESSION_COOKIE } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  avatarUrl: z.string().max(700_000).regex(/^data:image\/(jpeg|png|webp);base64,/).optional().or(z.literal("")).nullable(),
  university: z.string().trim().min(2).max(140),
  faculty: z.string().trim().min(2).max(140),
  course: z.string().trim().min(2).max(140),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia tena." }, { status: 401 });
  return NextResponse.json({ user: {
    name: user.name, email: user.email, avatarUrl: user.avatarUrl,
    university: user.university, faculty: user.faculty, course: user.course,
    role: user.role, createdAt: user.createdAt,
  }});
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia tena." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Taarifa si sahihi." }, { status: 400 }); }
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Hakikisha umejaza jina, chuo, faculty na kozi kwa usahihi." }, { status: 400 });
  try {
    const updated = await prisma.user.update({ where: { id: user.id }, data: {
      name: parsed.data.name, avatarUrl: parsed.data.avatarUrl || null,
      university: parsed.data.university, faculty: parsed.data.faculty,
      course: parsed.data.course, profileCompleted: true,
    }});
    return NextResponse.json({ success: true, user: { name: updated.name, email: updated.email, avatarUrl: updated.avatarUrl, university: updated.university, faculty: updated.faculty, course: updated.course }});
  } catch (error) {
    console.error("ACCOUNT_PROFILE_UPDATE_ERROR", error);
    return NextResponse.json({ error: "Imeshindikana kuhifadhi mabadiliko." }, { status: 500 });
  }
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(10).max(72),
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia tena." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Taarifa si sahihi." }, { status: 400 }); }
  const parsed = passwordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Password mpya iwe na angalau herufi 10." }, { status: 400 });
  const valid = await compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Password ya sasa si sahihi." }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hash(parsed.data.newPassword, 12) } });
  const jar = await cookies();
  const currentToken = jar.get(SESSION_COOKIE)?.value;
  if (currentToken) await prisma.session.deleteMany({ where: { userId: user.id, tokenHash: { not: hashToken(currentToken) } } });
  return NextResponse.json({ success: true, message: "Password imebadilishwa. Vifaa vingine vimeondolewa kwenye account." });
}
