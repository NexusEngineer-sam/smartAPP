import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getGoogleAccessToken, googleOAuthConfigured, uploadBackupToGoogleDrive } from "@/lib/google-drive-backup";

export const runtime = "nodejs";
export const maxDuration = 60;

function nextDate(frequency: string) {
  const days = frequency === "DAILY" ? 1 : frequency === "MONTHLY" ? 30 : 7;
  return new Date(Date.now() + days * 86400000);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia kwanza." }, { status: 401 });
  try {
    const connection = await prisma.googleDriveBackupConnection.findUnique({ where: { userId: user.id }, select: { googleEmail: true, frequency: true, lastBackupAt: true, nextBackupAt: true } });
    return NextResponse.json({ connected: Boolean(connection), connection });
  } catch (error) {
    console.error("GOOGLE_DRIVE_BACKUP_STATUS", error);
    return NextResponse.json({ error: "Backup database haijaandaliwa bado." }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia kwanza." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Taarifa si sahihi." }, { status: 400 }); }
  const frequency = (body as { frequency?: string })?.frequency;
  if (!["DAILY", "WEEKLY", "MONTHLY"].includes(String(frequency))) return NextResponse.json({ error: "Chagua Daily, Weekly au Monthly." }, { status: 400 });
  try {
    const connection = await prisma.googleDriveBackupConnection.update({ where: { userId: user.id }, data: { frequency, nextBackupAt: nextDate(frequency!) }, select: { frequency: true, nextBackupAt: true } });
    return NextResponse.json({ success: true, connection });
  } catch { return NextResponse.json({ error: "Unganisha Google Drive kwanza." }, { status: 400 }); }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Tafadhali ingia kwanza." }, { status: 401 });
  if (!googleOAuthConfigured()) return NextResponse.json({ error: "Google Drive haijawekwa kwenye server bado." }, { status: 503 });
  try {
    const connection = await prisma.googleDriveBackupConnection.findUnique({ where: { userId: user.id } });
    if (!connection) return NextResponse.json({ error: "Unganisha Google Drive kwanza." }, { status: 400 });

    const [expenses, studentLife, schedules, notifications, eventRegistrations, ownedEvents, communityMemberships, communityPosts, communityMessages, studentProfile, sentClassMessages, videos, adCampaigns, chatMemberships, classGroup, socialPosts, socialComments, socialLikes] = await Promise.all([
      prisma.expense.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.studentLifeItem.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.personalSchedule.findMany({ where: { userId: user.id }, orderBy: { startsAt: "asc" } }),
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, body: true, channel: true, status: true, sentAt: true, createdAt: true } }),
      prisma.eventRegistration.findMany({ where: { userId: user.id }, include: { event: { select: { title: true, description: true, category: true, venue: true, startsAt: true, endsAt: true, organizerName: true } } } }),
      prisma.campusEvent.findMany({ where: { organizerId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.globalCommunityMembership.findMany({ where: { userId: user.id }, include: { community: { select: { name: true, slug: true, country: true, university: true, category: true } } } }),
      prisma.globalCommunityPost.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.globalCommunityMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.globalStudentProfile.findUnique({ where: { userId: user.id } }),
      prisma.classMessage.findMany({ where: { senderId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.campusVideo.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
      prisma.adCampaign.findMany({ where: { advertiserId: user.id }, include: { likes: { where: { userId: user.id }, select: { createdAt: true } }, comments: { where: { userId: user.id }, select: { body: true, createdAt: true } } } }),
      prisma.chatParticipant.findMany({ where: { userId: user.id }, include: { conversation: { include: { participants: { select: { userId: true, joinedAt: true } }, messages: { orderBy: { createdAt: "asc" } } } } } }),
      prisma.user.findUnique({ where: { id: user.id }, select: { classGroup: { select: { name: true } } } }),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT \\\"id\\\",\\\"content\\\",\\\"mediaUrl\\\",\\\"mediaType\\\",\\\"createdAt\\\",\\\"updatedAt\\\" FROM \\\"SocialPost\\\" WHERE \\\"userId\\\" = $1 ORDER BY \\\"createdAt\\\" ASC", user.id),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT \\\"id\\\",\\\"postId\\\",\\\"body\\\",\\\"createdAt\\\" FROM \\\"SocialPostComment\\\" WHERE \\\"userId\\\" = $1 ORDER BY \\\"createdAt\\\" ASC", user.id),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>("SELECT \\\"postId\\\",\\\"createdAt\\\" FROM \\\"SocialPostLike\\\" WHERE \\\"userId\\\" = $1 ORDER BY \\\"createdAt\\\" ASC", user.id),
    ]);

    const backup = {
      product: "SAMWEL CAMPUS OS", backupType: "personal-account", schemaVersion: 1, exportedAt: new Date().toISOString(),
      owner: { email: user.email, name: user.name },
      profile: { name: user.name, email: user.email, avatarUrl: user.avatarUrl, university: user.university, faculty: user.faculty, course: user.course, role: user.role, profileCompleted: user.profileCompleted, createdAt: user.createdAt },
      classGroup: classGroup?.classGroup ?? null,
      data: { expenses, studentLife, personalSchedules: schedules, notifications, eventRegistrations, ownedEvents, communityMemberships, communityPosts, communityMessages, globalStudentProfile: studentProfile, sentClassMessages, campusVideos: videos, adCampaigns, socialPosts, socialComments, socialLikes, conversations: chatMemberships.map((item) => ({ conversationId: item.conversationId, joinedAt: item.joinedAt, participants: item.conversation.participants, messages: item.conversation.messages })) },
      exclusions: ["password hashes", "login sessions", "OAuth tokens", "push notification secrets", "other users' account profiles"],
      mediaNote: "Picha na video zenyewe hazijajumuishwa; backup inahifadhi metadata na media URLs zinazohusiana na akaunti yako.",
    };
    const json = JSON.stringify(backup, (_key, value) => typeof value === "bigint" ? value.toString() : value);
    if (Buffer.byteLength(json, "utf8") > 20 * 1024 * 1024) return NextResponse.json({ error: "Backup imezidi 20MB. Wasiliana na support ili kugawa backup." }, { status: 413 });
    const accessToken = await getGoogleAccessToken(connection.encryptedRefreshToken);
    const fileName = `SAMWEL-CAMPUS-OS-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    const uploaded = await uploadBackupToGoogleDrive(accessToken, fileName, json);
    const now = new Date();
    await prisma.googleDriveBackupConnection.update({ where: { userId: user.id }, data: { lastBackupAt: now, lastBackupFileId: uploaded.id, nextBackupAt: nextDate(connection.frequency) } });
    return NextResponse.json({ success: true, fileName: uploaded.name, backedUpAt: now.toISOString(), bytes: Buffer.byteLength(json, "utf8"), googleEmail: connection.googleEmail });
  } catch (error) {
    console.error("GOOGLE_DRIVE_BACKUP_CREATE", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Backup imeshindikana. Jaribu tena." }, { status: 500 });
  }
}
