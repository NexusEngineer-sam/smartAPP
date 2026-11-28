import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { encryptRefreshToken, googleOAuthConfigured } from "@/lib/google-drive-backup";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const base = new URL("/account", request.url);
  const fail = (reason: string) => { base.searchParams.set("drive", reason); return NextResponse.redirect(base); };
  const user = await getCurrentUser();
  if (!user) return fail("login_required");
  if (!googleOAuthConfigured()) return fail("not_configured");
  const jar = await cookies();
  const expectedState = jar.get("campus_drive_oauth_state")?.value;
  const state = request.nextUrl.searchParams.get("state");
  jar.delete("campus_drive_oauth_state");
  if (!expectedState || !state || expectedState !== state) return fail("state_error");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return fail("cancelled");
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!, client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!, redirect_uri: process.env.GOOGLE_DRIVE_REDIRECT_URI!, grant_type: "authorization_code" }),
      cache: "no-store",
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) return fail("token_error");
    const infoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokenData.access_token}` }, cache: "no-store" });
    const info = await infoResponse.json();
    if (!infoResponse.ok) return fail("profile_error");
    const previous = await prisma.googleDriveBackupConnection.findUnique({ where: { userId: user.id } });
    const refreshToken = tokenData.refresh_token ? encryptRefreshToken(String(tokenData.refresh_token)) : previous?.encryptedRefreshToken;
    if (!refreshToken) return fail("refresh_token_missing");
    await prisma.googleDriveBackupConnection.upsert({
      where: { userId: user.id },
      create: { userId: user.id, googleEmail: typeof info.email === "string" ? info.email : null, encryptedRefreshToken: refreshToken, frequency: "WEEKLY", nextBackupAt: new Date(Date.now() + 7 * 86400000) },
      update: { googleEmail: typeof info.email === "string" ? info.email : null, encryptedRefreshToken: refreshToken },
    });
    base.searchParams.set("drive", "connected");
    return NextResponse.redirect(base);
  } catch (error) {
    console.error("GOOGLE_DRIVE_OAUTH_CALLBACK", error);
    return fail("connection_error");
  }
}
