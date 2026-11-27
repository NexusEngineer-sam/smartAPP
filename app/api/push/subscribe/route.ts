import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

const schema = z.object({
  endpoint: z.string().url().max(3000),
  keys: z.object({ p256dh: z.string().min(20).max(500), auth: z.string().min(10).max(200) }),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid device subscription." }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth },
  });
  const configured = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
  if (configured) await sendPushToUser(user.id, "Phone alerts enabled", "SAMWEL CAMPUS OS is now connected to this device.", "/");
  return NextResponse.json({ ok: true, pushConfigured: configured });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = z.object({ endpoint: z.string().url() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid endpoint." }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { userId: user.id, endpoint: parsed.data.endpoint } });
  return NextResponse.json({ ok: true });
}
