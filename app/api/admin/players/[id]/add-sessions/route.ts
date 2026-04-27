import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL;
}

// Inserts N dummy completed sessions in the past, for testing days_played counts.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { count } = await req.json();
  if (!count || count < 1 || count > 30) {
    return NextResponse.json({ error: "count must be 1–30" }, { status: 400 });
  }
  const db = await getDb();
  for (let i = 1; i <= count; i++) {
    const date = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    await db.query(
      `INSERT INTO player_sessions (player_id, game_date, answers_json, score, completed)
       VALUES ($1, $2, $3, 0, 1) ON CONFLICT DO NOTHING`,
      [id, date, JSON.stringify([])]
    );
  }
  return NextResponse.json({ ok: true });
}
