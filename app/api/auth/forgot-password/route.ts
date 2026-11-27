import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";

const schema = z.object({ email: z.string().trim().email().max(190) });
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ message: "If that account exists, a reset link will be sent." });
    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, isActive: true } });
    // Keep the response identical whether or not the account exists.
    if (user?.isActive) {
      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hash(rawToken);
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
      const origin = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
      const resetUrl = origin.replace(/\/$/, "") + "/reset-password?token=" + rawToken;
      const apiKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM_EMAIL;
      if (!apiKey || !from) {
        console.error("PASSWORD_RESET_EMAIL_NOT_CONFIGURED");
        await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
      } else {
        const mail = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            from,
            to: [user.email],
            subject: "Reset your SAMWEL CAMPUS OS password",
            html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033"><h2>Password reset</h2><p>We received a request to reset your SAMWEL CAMPUS OS password.</p><p><a href="' + resetUrl + '" style="display:inline-block;background:#1d4ed8;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none">Create a new password</a></p><p>This link expires in 30 minutes and can only be used once. If you did not request this, ignore this email.</p></div>'
          })
        });
        if (!mail.ok) {
          console.error("PASSWORD_RESET_EMAIL_FAILED", await mail.text());
          await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
        }
      }
    }
    return NextResponse.json({ message: "If that account exists, a reset link will be sent." });
  } catch (error) {
    console.error("FORGOT_PASSWORD_API_ERROR", error);
    return NextResponse.json({ message: "If that account exists, a reset link will be sent." });
  }
}
