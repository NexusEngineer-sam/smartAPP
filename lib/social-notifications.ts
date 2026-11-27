import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendPushToUser } from "@/lib/push";

export async function notifySocialUser(input: {
  recipientId: string;
  actorId: string;
  actorName: string;
  kind: "like" | "comment";
  postId: string;
  preview?: string;
}) {
  if (input.recipientId === input.actorId) return;
  const isLike = input.kind === "like";
  const title = isLike ? "Someone liked your post" : "New comment on your post";
  const body = isLike
    ? `${input.actorName} liked your campus post.`
    : `${input.actorName}: ${(input.preview || "Commented on your post").slice(0, 120)}`;
  await prisma.notification.create({
    data: {
      userId: input.recipientId,
      title,
      body,
      channel: "IN_APP",
      status: "QUEUED",
      dedupeKey: `social:${input.kind}:${randomUUID()}`,
    },
  });
  try {
    await sendPushToUser(input.recipientId, title, body, "/");
  } catch {
    // Keep the in-app notification even when this device has no valid push setup.
  }
}
