import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/auth";

async function adminFromRequest(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt.getTime() < Date.now() || !session.user.isActive || session.user.role !== "ADMIN") return null;
  return session.user;
}

export async function GET(request: Request) {
  try {
    const admin = await adminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Admin session expired." }, { status: 401 });
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [users, activeUsers, classes, ads, pendingAds, videos, comments, recentUsers, recentAds, audit, recentComments, recentMessages] = await Promise.all([
      prisma.user.count(), prisma.user.count({ where: { isActive: true } }), prisma.campusClass.count(),
      prisma.adCampaign.count(), prisma.adCampaign.count({ where: { status: "PENDING" } }),
      prisma.campusVideo.count(), prisma.adComment.count(),
      prisma.user.findMany({ take: 6, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      prisma.adCampaign.findMany({ take: 6, orderBy: { createdAt: "desc" }, select: { id: true, title: true, businessName: true, status: true, createdAt: true } }),
      prisma.auditLog.findMany({ take: 20, orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true, email: true } } } }),
      prisma.adComment.findMany({ take: 8, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } }, campaign: { select: { title: true } } } }),
      prisma.classMessage.findMany({ take: 6, orderBy: { createdAt: "desc" }, include: { sender: { select: { name: true } }, campusClass: { select: { name: true } } } }),
    ]);
    const events = [
      ...audit.map(x => ({ id: x.id, type: "AUDIT", title: x.action.replaceAll("_", " "), detail: `${x.actor.name} · ${x.entityType}`, at: x.createdAt })),
      ...recentUsers.map(x => ({ id: `user-${x.id}`, type: "USER", title: "New account registered", detail: `${x.name} · ${x.email}`, at: x.createdAt })),
      ...recentAds.map(x => ({ id: `ad-${x.id}`, type: "AD", title: `Advert ${x.status.toLowerCase()}`, detail: `${x.businessName} · ${x.title}`, at: x.createdAt })),
      ...recentComments.map(x => ({ id: `comment-${x.id}`, type: "COMMENT", title: "New Spotlight comment", detail: `${x.user.name} · ${x.campaign.title}`, at: x.createdAt })),
      ...recentMessages.map(x => ({ id: `message-${x.id}`, type: "CLASS", title: "Class representative message", detail: `${x.sender.name} · ${x.campusClass.name}`, at: x.createdAt })),
    ].sort((a,b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0,30);
    const last24h = await prisma.user.count({ where: { createdAt: { gte: since } } });
    return NextResponse.json({ ok: true, admin: { name: admin.name, email: admin.email }, metrics: { users, activeUsers, classes, ads, pendingAds, videos, comments, newUsers24h: last24h }, events, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("DATA_CENTER_OVERVIEW_ERROR", error);
    return NextResponse.json({ error: "Imeshindikana kusoma taarifa za mfumo." }, { status: 503 });
  }
}
