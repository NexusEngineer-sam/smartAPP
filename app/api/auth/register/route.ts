import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { hashToken, SESSION_COOKIE } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(190),
  password: z.string().min(10).max(72),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check your name, email and password (minimum 10 characters)." },
      { status: 400 }
    );
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  try {
    // Create the account and its session together. If Session is missing or
    // either insert fails, the transaction rolls back instead of leaving
    // an account that appears registered but cannot sign in.
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name, email, passwordHash: await hash(password, 12), role: "STUDENT" },
      });

      await tx.session.create({
        data: { userId: created.id, tokenHash: hashToken(token), expiresAt },
      });

      return created;
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return NextResponse.json(
      { user: { id: user.id, name: user.name, email: user.email, role: user.role } },
      { status: 201 }
    );
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "UNKNOWN";

    console.error("REGISTER_API_ERROR", {
      code,
      message: error instanceof Error ? error.message : String(error),
    });

    if (code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists. Try signing in." }, { status: 409 });
    }
    if (code === "P2021" || code === "P2022") {
      return NextResponse.json(
        { error: "The database setup is incomplete. Please contact the system administrator." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "Registration could not be completed. Please try again later." },
      { status: 500 }
    );
  }
}
