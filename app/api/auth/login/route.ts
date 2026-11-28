import { NextResponse } from "next/server";
import { z } from "zod";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

const schema = z.object({
  email: z.string().trim().email().max(190),
  password: z.string().min(1).max(72),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive || !(await compare(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // Bootstrap the verified platform owner account after successful password
    // authentication. The email is allowlisted and the password is still required.
    const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const authenticatedUser = ownerEmail && email === ownerEmail && user.role !== "ADMIN"
      ? await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } })
      : user;

    await createSession(authenticatedUser.id);
    return NextResponse.json({
      user: { id: authenticatedUser.id, name: authenticatedUser.name, email: authenticatedUser.email, role: authenticatedUser.role },
    });
  } catch (error) {
    console.error("LOGIN_API_ERROR", error);
    return NextResponse.json(
      { error: "Login service is temporarily unavailable. Please try again shortly." },
      { status: 500 }
    );
  }
}
