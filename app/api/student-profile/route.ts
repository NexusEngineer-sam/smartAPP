import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  university: z.string().trim().min(2).max(140),
  faculty: z.string().trim().min(2).max(140),
  course: z.string().trim().min(2).max(140),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia kwanza." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Taarifa si sahihi." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Jaza chuo, faculty na kozi kwa usahihi." }, { status: 400 });
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { university: parsed.data.university, faculty: parsed.data.faculty, course: parsed.data.course, profileCompleted: true },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("STUDENT_PROFILE_SAVE_ERROR", error);
    return NextResponse.json({ error: "Imeshindikana kuhifadhi taarifa. Jaribu tena." }, { status: 500 });
  }
}
