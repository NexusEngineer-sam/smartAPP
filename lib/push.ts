import webpush from "web-push";
import { prisma } from "@/lib/db";

type VapidConfig = { publicKey: string; privateKey: string; subject: string };

/**
 * Supports the documented individual Render environment variables.
 * VAPID_KEYS remains supported for backward compatibility with older deployments.
 */
export function getVapidConfig(): VapidConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (publicKey && privateKey && subject) {
    return { publicKey, privateKey, subject };
  }

  const raw = process.env.VAPID_KEYS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VapidConfig>;
    if (!parsed.publicKey || !parsed.privateKey || !parsed.subject) return null;
    return { publicKey: parsed.publicKey, privateKey: parsed.privateKey, subject: parsed.subject };
  } catch {
    return null;
  }
}

export async function sendPushToUser(userId: string, title: string, body: string, url = "/") {
  const vapid = getVapidConfig();
  if (!vapid) return { sent: 0, skipped: true };
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url, tag: "campus-os" })
      );
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      }
    }
  }
  return { sent, skipped: false };
}

export async function sendPushToAll(title: string, body: string, url = "/") {
  if (!getVapidConfig()) return { sent: 0, skipped: true };
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  let sent = 0;
  for (const user of users) sent += (await sendPushToUser(user.id, title, body, url)).sent;
  return { sent, skipped: false };
}
