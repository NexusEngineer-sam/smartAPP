import webpush from "web-push";
import { prisma } from "@/lib/db";

function configured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export async function sendPushToUser(userId: string, title: string, body: string, url = "/") {
  if (!configured()) return { sent: 0, skipped: true };
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify({ title, body, url, tag: "campus-os" }));
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
    }
  }
  return { sent, skipped: false };
}

export async function sendPushToAll(title: string, body: string, url = "/") {
  if (!configured()) return { sent: 0, skipped: true };
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  let sent = 0;
  for (const user of users) sent += (await sendPushToUser(user.id, title, body, url)).sent;
  return { sent, skipped: false };
}
