import { getDb } from "@/lib/db/client";
import { todayDate, MAX_DAILY_QUESTIONS, getDayNumber } from "@/lib/game";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const tz = searchParams.get("tz") ?? undefined;
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const db = await getDb();
  const { rows: playerRows } = await db.query("SELECT * FROM players WHERE slug = $1", [slug]);
  if (!playerRows.length) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  const player = playerRows[0];

  const { rows: daysRows } = await db.query(
    "SELECT COUNT(*) as count FROM player_sessions WHERE player_id = $1",
    [player.id]
  );
  const days_played = parseInt(daysRows[0].count, 10);

  const today = todayDate(tz);
  const { rows: sessionRows } = await db.query(
    "SELECT answers_json, score FROM player_sessions WHERE player_id = $1 AND game_date = $2",
    [player.id, today]
  );

  const answers: { correct: boolean }[] = sessionRows.length
    ? JSON.parse(sessionRows[0].answers_json)
    : [];

  const completed = answers.length >= MAX_DAILY_QUESTIONS;

  // Today's media (same for everyone, day-based)
  const { rows: allMedia } = await db.query(
    "SELECT filename, type FROM media_items ORDER BY CASE WHEN type = 'video' THEN 0 ELSE 1 END, id"
  );
  const media = allMedia.length > 0 ? allMedia[getDayNumber() % allMedia.length] : null;
  const mediaBase = process.env.MEDIA_BASE_URL ?? "";
  const mediaUrl = media
    ? `${mediaBase}/${media.type === "video" ? "videos" : "photos"}/${media.filename}`
    : null;

  return NextResponse.json({
    player,
    days_played,
    questions_answered: answers.length,
    questions_remaining: Math.max(0, MAX_DAILY_QUESTIONS - answers.length),
    score_today: answers.filter((a) => a.correct).length,
    completed,
    media_url: mediaUrl,
    media_type: media?.type ?? null,
  });
}
