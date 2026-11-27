import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const databaseUrlConfigured = Boolean(process.env.DATABASE_URL);

  try {
    if (!databaseUrlConfigured) {
      return NextResponse.json(
        {
          ok: false,
          service: "SAMWEL CAMPUS OS",
          database: "unavailable",
          diagnostic: "DATABASE_URL_MISSING",
        },
        { status: 503 }
      );
    }

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
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "UNKNOWN";

    console.error("HEALTH_CHECK_ERROR", {
      code,
      message: error instanceof Error ? error.message : String(error),
    });

    const diagnostic =
      code === "P1000"
        ? "DATABASE_AUTHENTICATION_FAILED"
        : code === "P1001"
          ? "DATABASE_SERVER_UNREACHABLE"
          : code === "P1012"
            ? "DATABASE_CONFIGURATION_ERROR"
            : code === "P2021" || code === "P2022"
              ? "DATABASE_SCHEMA_INCOMPLETE"
              : "DATABASE_CONNECTION_FAILED";

    return NextResponse.json(
      {
        ok: false,
        service: "SAMWEL CAMPUS OS",
        database: "unavailable",
        diagnostic,
        databaseUrlConfigured,
      },
      { status: 503 }
    );
  }
}
