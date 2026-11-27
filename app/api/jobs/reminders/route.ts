import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

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
        await sendPushToUser(recipient.userId, "Upcoming class", `${event.title} starts soon at ${event.startsAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.`, "/#planner");
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002")) throw error;
      }
    }
  }

  // Personal schedules created by students (lectures, study sessions, deadlines and exams).
  const personal = await prisma.personalSchedule.findMany({
    where: { done: false, reminderMins: { gt: 0 }, OR: [{ startsAt: { gt: now, lte: horizon } }, { repeatWeekly: true }] },
    include: { user: { select: { isActive: true } } },
    take: 1000,
  });
  for (const item of personal) {
    if (!item.user.isActive) continue;
    let occurrence = item.startsAt;
    if (item.repeatWeekly) {
      const day = item.startsAt.getUTCDay();
      occurrence = new Date(now);
      occurrence.setUTCHours(item.startsAt.getUTCHours(), item.startsAt.getUTCMinutes(), 0, 0);
      const delta = (day - occurrence.getUTCDay() + 7) % 7;
      occurrence.setUTCDate(occurrence.getUTCDate() + delta);
      if (occurrence.getTime() <= now.getTime()) occurrence.setUTCDate(occurrence.getUTCDate() + 7);
    }
    const remaining = occurrence.getTime() - now.getTime();
    if (remaining < 0 || remaining > item.reminderMins * 60_000) continue;
    const dayKey = occurrence.toISOString().slice(0, 10);
    const dedupeKey = `personal-reminder:${item.id}:${dayKey}`;
    const kindLabel: Record<string,string> = { CLASS: "Lecture inaanza", STUDY: "Muda wa kusoma", ASSIGNMENT: "Assignment deadline", EXAM: "Mtihani unakaribia" };
    const time = occurrence.toLocaleTimeString("sw-TZ", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dar_es_Salaam" });
    const title = kindLabel[item.kind] || "Ukumbusho wa masomo";
    const body = `${item.title} · ${time}${item.location ? " · " + item.location : ""}`;
    try {
      await prisma.notification.create({ data: { userId: item.userId, dedupeKey, title, body } });
      created++;
      await sendPushToUser(item.userId, title, body, "/#planner");
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "P2002")) throw error;
    }
  }

  return NextResponse.json({ ok: true, eventsChecked: events.length, personalSchedulesChecked: personal.length, notificationsCreated: created });
}
