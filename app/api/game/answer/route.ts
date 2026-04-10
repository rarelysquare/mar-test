import { getDb } from "@/lib/db/client";
import { checkAnswer, pickVideoByTags, todayDate, MAX_DAILY_QUESTIONS } from "@/lib/game";
import { NextResponse } from "next/server";
import type { Pool } from "pg";

type MediaRow = { id: number; filename: string; tags: string };

async function pickMediaForPlayer(
  db: Pool,
  playerId: number,
  questionTagSet: Set<string>
): Promise<{ id: number; filename: string; type: string } | null> {
  const { rows: seenRows } = await db.query(
    "SELECT media_id FROM player_media_history WHERE player_id = $1",
    [playerId]
  );
  const seenIds = seenRows.map((r: { media_id: number }) => r.media_id);

  const notInClause = (startIdx: number) =>
    seenIds.length > 0
      ? ` AND id NOT IN (${seenIds.map((_: number, i: number) => `$${startIdx + i}`).join(",")})`
      : "";

  // 1. Try unseen videos
  const { rows: unseenVideos } = await db.query(
    `SELECT id, filename, tags FROM media_items WHERE type = 'video'${notInClause(1)}`,
    seenIds
  ) as { rows: MediaRow[] };

  if (unseenVideos.length > 0) {
    const picked = pickVideoByTags(unseenVideos, questionTagSet)!;
    return { id: picked.id, filename: picked.filename, type: "video" };
  }

  // 2. Try unseen photos
  const { rows: unseenPhotos } = await db.query(
    `SELECT id, filename, tags FROM media_items WHERE type = 'photo'${notInClause(1)}`,
    seenIds
  ) as { rows: MediaRow[] };

  if (unseenPhotos.length > 0) {
    const picked = unseenPhotos[Math.floor(Math.random() * unseenPhotos.length)];
    return { id: picked.id, filename: picked.filename, type: "photo" };
  }

  // 3. All exhausted — reset and start fresh
  await db.query("DELETE FROM player_media_history WHERE player_id = $1", [playerId]);

  const { rows: allVideos } = await db.query(
    "SELECT id, filename, tags FROM media_items WHERE type = 'video'"
  ) as { rows: MediaRow[] };
  if (allVideos.length > 0) {
    const picked = pickVideoByTags(allVideos, questionTagSet)!;
    return { id: picked.id, filename: picked.filename, type: "video" };
  }

  const { rows: allPhotos } = await db.query(
    "SELECT id, filename, tags FROM media_items WHERE type = 'photo'"
  ) as { rows: MediaRow[] };
  if (allPhotos.length > 0) {
    const picked = allPhotos[Math.floor(Math.random() * allPhotos.length)];
    return { id: picked.id, filename: picked.filename, type: "photo" };
  }

  return null;
}

export async function POST(req: Request) {
  const { slug, question_id, selected_option } = await req.json();
  if (!slug || question_id == null || !selected_option) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const db = await getDb();

  const { rows: playerRows } = await db.query(
    "SELECT * FROM players WHERE slug = $1", [slug]
  );
  if (!playerRows.length) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  const player = playerRows[0];

  const { rows: questionRows } = await db.query(
    "SELECT * FROM trivia_questions WHERE id = $1", [question_id]
  );
  if (!questionRows.length) return NextResponse.json({ error: "Question not found" }, { status: 404 });
  const question = questionRows[0];

  const isCorrect = checkAnswer(question.answer_type, question.answer, selected_option);
  const today = todayDate();

  const { rows: sessionRows } = await db.query(
    "SELECT * FROM player_sessions WHERE player_id = $1 AND game_date = $2",
    [player.id, today]
  );
  const session = sessionRows[0];

  const answers: { question_id: number; category: string; selected: string; correct: boolean }[] =
    session ? JSON.parse(session.answers_json) : [];

  if (answers.some((a) => a.question_id === question_id)) {
    return NextResponse.json({ error: "Already answered" }, { status: 409 });
  }

  answers.push({ question_id, category: question.category, selected: selected_option, correct: isCorrect });
  const totalCorrect = answers.filter((a) => a.correct).length;

  if (session) {
    await db.query(
      "UPDATE player_sessions SET answers_json = $1, score = $2 WHERE id = $3",
      [JSON.stringify(answers), totalCorrect, session.id]
    );
  } else {
    await db.query(
      "INSERT INTO player_sessions (player_id, game_date, answers_json, score) VALUES ($1, $2, $3, $4)",
      [player.id, today, JSON.stringify(answers), totalCorrect]
    );
  }

  if (answers.length >= MAX_DAILY_QUESTIONS) {
    await db.query(
      "UPDATE player_sessions SET completed = 1, completed_at = to_char(now(), 'YYYY-MM-DD\"T\"HH24:MI:SS\"Z\"') WHERE player_id = $1 AND game_date = $2",
      [player.id, today]
    );
  }

  if (isCorrect) {
    await db.query("UPDATE players SET total_points = total_points + 10 WHERE id = $1", [player.id]);
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (answers.length === 1) {
    if (player.last_played_date === yesterday) {
      const newStreak = player.current_streak + 1;
      await db.query(
        "UPDATE players SET current_streak = $1, longest_streak = GREATEST(longest_streak, $2), last_played_date = $3 WHERE id = $4",
        [newStreak, newStreak, today, player.id]
      );
    } else {
      await db.query(
        "UPDATE players SET current_streak = 1, last_played_date = $1 WHERE id = $2",
        [today, player.id]
      );
    }
  }

  const questionTagSet = new Set<string>(
    question.tags.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean)
  );
  const media = await pickMediaForPlayer(db, player.id, questionTagSet);

  if (media) {
    await db.query(
      "INSERT INTO player_media_history (player_id, media_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [player.id, media.id]
    );
  }

  const mediaBase = process.env.MEDIA_BASE_URL ?? "";
  const mediaPath = media
    ? `${mediaBase}/${media.type === "video" ? "videos" : "photos"}/${media.filename}`
    : null;

  return NextResponse.json({
    correct: isCorrect,
    correct_answer: question.answer,
    follow_up_context: question.follow_up_context,
    questions_remaining: Math.max(0, MAX_DAILY_QUESTIONS - answers.length),
    media_url: mediaPath,
    media_type: media?.type ?? null,
  });
}
