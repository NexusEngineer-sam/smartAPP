import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function getPriority(title: string, body: string, channel: string) {
  const text = `${title} ${body} ${channel}`.toLowerCase();
  if (/exam|examination|deadline|urgent|emergency|security|password|account|fee|payment|registration|timetable change|cancelled|canceled/.test(text)) return "HIGH";
  if (/class|lecture|course|assignment|test|quiz|event|announcement|campus|timetable|reminder/.test(text)) return "NORMAL";
  return "LOW";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const enriched = notifications.map((item) => ({
    ...item,
    priority: getPriority(item.title, item.body, item.channel),
  }));

  return NextResponse.json({ notifications: enriched });
}
