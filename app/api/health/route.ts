import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const tables = await prisma.$queryRaw<
      Array<{ user_table: string | null; session_table: string | null }>
    >`
      SELECT
        to_regclass('public."User"')::text AS user_table,
        to_regclass('public."Session"')::text AS session_table
    `;

    const userReady = Boolean(tables[0]?.user_table);
    const sessionReady = Boolean(tables[0]?.session_table);
    const databaseReady = userReady && sessionReady;

    return NextResponse.json(
      {
        ok: databaseReady,
        service: "SAMWEL CAMPUS OS",
        database: databaseReady ? "connected" : "schema_incomplete",
        checks: { userTable: userReady, sessionTable: sessionReady },
      },
      { status: databaseReady ? 200 : 503 }
    );
  } catch (error) {
    console.error("HEALTH_CHECK_ERROR", error);
    return NextResponse.json(
      { ok: false, service: "SAMWEL CAMPUS OS", database: "unavailable" },
      { status: 503 }
    );
  }
}
