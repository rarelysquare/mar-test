import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { todayDate } from "@/lib/game";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL;
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const db = await getDb();
  await db.query(
    "DELETE FROM player_sessions WHERE player_id = $1 AND game_date = $2",
    [id, todayDate()]
  );
  return NextResponse.json({ ok: true });
}
