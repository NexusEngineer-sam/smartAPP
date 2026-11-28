import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { googleDriveAuthorizationUrl, googleOAuthConfigured } from "@/lib/google-drive-backup";

export const runtime = "nodejs";
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia kwanza." }, { status: 401 });
  if (!googleOAuthConfigured()) return NextResponse.json({ error: "Google Drive bado haijawekwa kwenye server. Admin anahitaji kuweka OAuth credentials." }, { status: 503 });
  const state = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set("campus_drive_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(googleDriveAuthorizationUrl(state));
}
