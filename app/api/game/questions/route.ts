import { getDb } from "@/lib/db/client";
import { CATEGORY_SLUGS, getDayNumber, todayDate } from "@/lib/game";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const categorySlug = searchParams.get("category");

  if (!slug || !categorySlug) {
    return NextResponse.json({ error: "slug and category required" }, { status: 400 });
  }

  const category = CATEGORY_SLUGS[categorySlug];
  if (!category) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const db = await getDb();

  const { rows: playerRows } = await db.query(
    "SELECT id, name FROM players WHERE slug = $1", [slug]
  );
  if (!playerRows.length) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  const player = playerRows[0];

  const today = todayDate();

  // Check if player already answered today
  const { rows: sessionRows } = await db.query(
    "SELECT answers_json FROM player_sessions WHERE player_id = $1 AND game_date = $2",
    [player.id, today]
  );
  const todayAnswers: { question_id: number }[] = sessionRows.length
    ? JSON.parse(sessionRows[0].answers_json)
    : [];
  if (todayAnswers.length > 0) {
    return NextResponse.json({ questions: [], remaining: 0 });
  }

  // Get all question IDs this player has ever answered (across all days)
  const { rows: allSessions } = await db.query(
    "SELECT answers_json FROM player_sessions WHERE player_id = $1",
    [player.id]
  );
  const allAnsweredIds = new Set<number>();
  for (const s of allSessions) {
    const answers: { question_id: number }[] = JSON.parse(s.answers_json);
    answers.forEach((a) => allAnsweredIds.add(a.question_id));
  }

  // Get all active questions ordered consistently (same for everyone)
  const { rows: allQuestions } = await db.query(
    category === "daily"
      ? "SELECT id, question, answer_type, options_json, answer, follow_up_context FROM trivia_questions WHERE active = 1 ORDER BY id"
      : "SELECT id, question, answer_type, options_json, answer, follow_up_context FROM trivia_questions WHERE active = 1 AND category = $1 ORDER BY id",
    category === "daily" ? [] : [category]
  );

  if (allQuestions.length === 0) {
    return NextResponse.json({ questions: [], remaining: 0 });
  }

  // Start from today's index (same for everyone), find first unanswered for this player
  const startIndex = getDayNumber() % allQuestions.length;
  let selected = null;
  for (let i = 0; i < allQuestions.length; i++) {
    const candidate = allQuestions[(startIndex + i) % allQuestions.length];
    if (!allAnsweredIds.has(candidate.id)) {
      selected = candidate;
      break;
    }
  }

  if (!selected) {
    // Player has answered every question — alert admin
    const alertValue = `${player.name} (${slug}) exhausted all questions on ${today}`;
    await db.query(
      `INSERT INTO config (key, value) VALUES ('alert_questions_exhausted', $1)
       ON CONFLICT (key) DO UPDATE SET value = config.value || ' | ' || EXCLUDED.value`,
      [alertValue]
    );
    return NextResponse.json({ questions: [], remaining: 0, exhausted: true });
  }

  const parsed = {
    ...selected,
    options: JSON.parse(selected.options_json),
    options_json: undefined,
  };

  return NextResponse.json({ questions: [parsed], remaining: 1 });
}
