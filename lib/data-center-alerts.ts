import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function notifyDataCenterAdmins(title: string, body: string, url = "/") {
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    const results = await Promise.allSettled(admins.map(admin => sendPushToUser(admin.id, title, body, url)));
    return results.reduce((count, result) => count + (result.status === "fulfilled" ? result.value.sent : 0), 0);
  } catch (error) {
    console.error("DATA_CENTER_ALERT_ERROR", error);
    return 0;
  }
}
