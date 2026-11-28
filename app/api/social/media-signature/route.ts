import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const resourceType = body?.resourceType === "video" ? "video" : body?.resourceType === "image" ? "image" : null;\n  const folder = body?.folder === "campus-stories" ? "campus-stories" : "campus-posts";
  if (!resourceType) return NextResponse.json({ error: "Choose an image or video." }, { status: 400 });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Media upload is not configured. Admin must add Cloudinary environment variables." }, { status: 503 });
  const timestamp = Math.floor(Date.now() / 1000);
  
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  return NextResponse.json({ cloudName, apiKey, timestamp, folder, signature, resourceType });
}
