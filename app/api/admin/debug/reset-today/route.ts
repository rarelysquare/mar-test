import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { todayDate } from "@/lib/game";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  const db = await getDb();
  const { rows } = await db.query("SELECT id FROM players WHERE slug = $1", [slug]);
  if (!rows.length) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  await db.query(
    "DELETE FROM player_sessions WHERE player_id = $1 AND game_date = $2",
    [rows[0].id, todayDate()]
  );
  return NextResponse.json({ ok: true });
}
