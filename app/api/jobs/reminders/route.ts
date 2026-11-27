import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const events = await prisma.timetableEvent.findMany({
    where: { isActive: true, startsAt: { gt: now, lte: horizon }, reminderMins: { gt: 0 } },
    include: { recipients: { where: { user: { isActive: true } }, select: { userId: true } } },
    take: 500,
  });

  let created = 0;
  for (const event of events) {
    // Respect each event's configured reminder lead time, rather than using
    // one global window for every class.
    if (event.startsAt.getTime() - now.getTime() > event.reminderMins * 60_000) continue;
    for (const recipient of event.recipients) {
      const dedupeKey = `class-reminder:${event.id}:${recipient.userId}`;
      try {
        await prisma.notification.create({
          data: {
            userId: recipient.userId,
            eventId: event.id,
            dedupeKey,
            title: "Upcoming class",
            body: `${event.title} starts at ${event.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.`,
          },
        });
        created++;
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002")) throw error;
      }
    }
  }
  return NextResponse.json({ ok: true, eventsChecked: events.length, notificationsCreated: created });
}
