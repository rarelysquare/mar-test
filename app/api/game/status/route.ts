import { getDb } from "@/lib/db/client";
import { todayDate, MAX_DAILY_QUESTIONS } from "@/lib/game";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const db = await getDb();
  const { rows: playerRows } = await db.query("SELECT * FROM players WHERE slug = $1", [slug]);
  if (!playerRows.length) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  const player = playerRows[0];

  const today = todayDate();
  const { rows: sessionRows } = await db.query(
    "SELECT answers_json, score FROM player_sessions WHERE player_id = $1 AND game_date = $2",
    [player.id, today]
  );

  const answers: { correct: boolean }[] = sessionRows.length
    ? JSON.parse(sessionRows[0].answers_json)
    : [];

  return NextResponse.json({
    player,
    questions_answered: answers.length,
    questions_remaining: Math.max(0, MAX_DAILY_QUESTIONS - answers.length),
    score_today: answers.filter((a) => a.correct).length,
    video_unlocked: answers.length >= MAX_DAILY_QUESTIONS,
  });
}
