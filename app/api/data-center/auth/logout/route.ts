import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth";
export async function POST(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  return NextResponse.json({ ok: true });
}
