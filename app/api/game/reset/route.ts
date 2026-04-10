import { getDb } from "@/lib/db/client";
import { todayDate } from "@/lib/game";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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
