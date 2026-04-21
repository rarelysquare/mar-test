import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL;
}

export async function GET() {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.slug, p.current_streak, p.total_points, p.created_at,
            COUNT(ps.id) as days_played
     FROM players p
     LEFT JOIN player_sessions ps ON ps.player_id = p.id
     GROUP BY p.id
     ORDER BY p.created_at DESC`
  );
  return NextResponse.json({ players: rows });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const db = await getDb();
  await db.query("DELETE FROM player_sessions WHERE player_id = $1", [id]);
  await db.query("DELETE FROM badges WHERE player_id = $1", [id]);
  await db.query("DELETE FROM players WHERE id = $1", [id]);

  return NextResponse.json({ ok: true });
}
