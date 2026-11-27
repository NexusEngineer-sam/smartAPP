import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const schema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1500),
  })).min(1).max(10),
});

const SYSTEM_PROMPT = `You are SAM AI, the helpful campus assistant inside SAMWEL CAMPUS OS.
Help students with campus dashboard navigation, study skills, time management, budgeting basics, digital safety, and general university life.
Respond naturally in the language the student uses, especially Kiswahili or English. Be clear, warm, concise, and practical.
Never claim you can see a student's timetable, grades, fees, identity record, notifications, or private database. You do not have access to those records.
Never invent official campus dates, fees, policies, contacts, room numbers, or announcements. Tell the student to confirm official details with campus administration.
Do not request passwords, API keys, payment PINs, or sensitive identity information.
If asked to change an account, submit a payment, send a notification, or edit an official record, explain that you cannot perform that action.`;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to use SAM AI." }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "SAM AI provider is not configured.", code: "AI_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid chat message." }, { status: 400 });
    }

    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...parsed.data.messages],
        max_completion_tokens: 600,
        temperature: 0.4,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });

    if (!upstream.ok) {
      const status = upstream.status;
      console.error("SAM_AI_PROVIDER_ERROR", { status });
      return NextResponse.json(
        { error: status === 429 ? "SAM AI imefikia kikomo cha maombi kwa sasa. Jaribu tena baadaye." : "SAM AI provider haipatikani kwa sasa." },
        { status: status === 429 ? 429 : 502 }
      );
    }

    const result = await upstream.json();
    const reply = result?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json({ error: "SAM AI haikupata jibu. Jaribu tena." }, { status: 502 });
    }

    return NextResponse.json({ reply: reply.trim() });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    console.error("SAM_AI_ROUTE_ERROR", { timedOut });
    return NextResponse.json(
      { error: timedOut ? "SAM AI imechelewa kujibu. Jaribu tena." : "Imeshindikana kupata jibu la SAM AI." },
      { status: timedOut ? 504 : 500 }
    );
  }
}
