import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Ctx = { params: Promise<{ id: string }> };
const startSchema = z.object({ kind: z.enum(["AUDIO", "VIDEO"]), offer: z.record(z.string(), z.unknown()) });
const updateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("accept"), answer: z.record(z.string(), z.unknown()) }),
  z.object({ action: z.literal("reject") }),
  z.object({ action: z.literal("end") }),
  z.object({ action: z.literal("candidate"), candidate: z.record(z.string(), z.unknown()) }),
]);

async function membership(conversationId: string, userId: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string; requestStatus: string; peerId: string }>>`
    SELECT c."id", c."requestStatus",
      (SELECT p2."userId" FROM "ChatParticipant" p2 WHERE p2."conversationId"=c."id" AND p2."userId"<> ${userId} LIMIT 1) AS "peerId"
    FROM "ChatConversation" c
    JOIN "ChatParticipant" p ON p."conversationId"=c."id"
    WHERE c."id"=${conversationId} AND p."userId"=${userId} AND c."isGroup"=false
    AND (SELECT COUNT(*) FROM "ChatParticipant" p3 WHERE p3."conversationId"=c."id")=2
    LIMIT 1
  `;
  return rows[0] || null;
}

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { id } = await params;
    const member = await membership(id, user.id);
    if (!member) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT * FROM "MessengerCall"
      WHERE "conversationId"=${id} AND ("callerId"=${user.id} OR "calleeId"=${user.id})
      ORDER BY "createdAt" DESC LIMIT 1
    `;
    const call = rows[0] || null;
    if (call && call.status === "RINGING" && call.calleeId === user.id &&
        Date.now() - new Date(String(call.createdAt)).getTime() > 45000) {
      await prisma.$executeRaw`UPDATE "MessengerCall" SET "status"='MISSED',"endedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${String(call.id)} AND "status"='RINGING'`;
      call.status = "MISSED";
    }
    return NextResponse.json({ call });
  } catch (error) {
    console.error("[messenger:calls:GET]", error);
    return NextResponse.json({ error: "Calls service unavailable." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { id } = await params;
    const member = await membership(id, user.id);
    if (!member) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    if (member.requestStatus !== "ACCEPTED") return NextResponse.json({ error: "Accept the chat request before calling." }, { status: 403 });
    const parsed = startSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid call offer." }, { status: 400 });
    const active = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "MessengerCall" WHERE "conversationId"=${id}
      AND "status" IN ('RINGING','ACCEPTED') AND "createdAt">NOW()-INTERVAL '2 minutes' LIMIT 1
    `;
    if (active.length) return NextResponse.json({ error: "A call is already in progress." }, { status: 409 });
    const callId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "MessengerCall" ("id","conversationId","callerId","calleeId","kind","status","offer","createdAt","updatedAt")
      VALUES (${callId},${id},${user.id},${member.peerId},${parsed.data.kind},'RINGING',${JSON.stringify(parsed.data.offer)}::jsonb,NOW(),NOW())
    `;
    return NextResponse.json({ callId, status: "RINGING" }, { status: 201 });
  } catch (error) {
    console.error("[messenger:calls:POST]", error);
    return NextResponse.json({ error: "Could not start call." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    const { id } = await params;
    const member = await membership(id, user.id);
    if (!member) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
    const parsed = updateSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid call update." }, { status: 400 });
    const rows = await prisma.$queryRaw<Array<{ id: string; callerId: string; calleeId: string; status: string }>>`
      SELECT "id","callerId","calleeId","status" FROM "MessengerCall"
      WHERE "conversationId"=${id} AND "status" IN ('RINGING','ACCEPTED')
      ORDER BY "createdAt" DESC LIMIT 1
    `;
    const call = rows[0];
    if (!call || (call.callerId !== user.id && call.calleeId !== user.id))
      return NextResponse.json({ error: "No active call." }, { status: 404 });
    const update = parsed.data;
    if (update.action === "accept") {
      if (call.calleeId !== user.id || call.status !== "RINGING") return NextResponse.json({ error: "Call cannot be accepted." }, { status: 409 });
      await prisma.$executeRaw`UPDATE "MessengerCall" SET "status"='ACCEPTED',"answer"=${JSON.stringify(update.answer)}::jsonb,"updatedAt"=NOW() WHERE "id"=${call.id}`;
    } else if (update.action === "reject" || update.action === "end") {
      await prisma.$executeRaw`UPDATE "MessengerCall" SET "status"=${update.action === "reject" ? "REJECTED" : "ENDED"},"endedAt"=NOW(),"updatedAt"=NOW() WHERE "id"=${call.id}`;
    } else {
      const column = call.callerId === user.id ? "callerCandidates" : "calleeCandidates";
      await prisma.$executeRawUnsafe(
        `UPDATE "MessengerCall" SET "${column}" = "${column}" || $1::jsonb, "updatedAt"=NOW() WHERE "id"=$2`,
        JSON.stringify([update.candidate]), call.id
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[messenger:calls:PATCH]", error);
    return NextResponse.json({ error: "Could not update call." }, { status: 500 });
  }
}
