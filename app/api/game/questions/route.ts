import { getDb } from "@/lib/db/client";
import { CATEGORY_SLUGS, MAX_DAILY_QUESTIONS, todayDate } from "@/lib/game";
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
    "SELECT id FROM players WHERE slug = $1", [slug]
  );
  if (!playerRows.length) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  const playerId = playerRows[0].id;

  const today = todayDate();
  const { rows: sessionRows } = await db.query(
    "SELECT answers_json FROM player_sessions WHERE player_id = $1 AND game_date = $2",
    [playerId, today]
  );

  const answers: { question_id: number }[] = sessionRows.length
    ? JSON.parse(sessionRows[0].answers_json)
    : [];

  const remaining = MAX_DAILY_QUESTIONS - answers.length;
  if (remaining <= 0) return NextResponse.json({ questions: [], remaining: 0 });

  const answeredIds = answers.map((a) => a.question_id);

  // Build parameterized query dynamically
  const params: (string | number)[] = [];
  let p = 1;

  const categoryFilter = category === "daily" ? "" : `AND category = $${p++}`;
  if (category !== "daily") params.push(category);

  const exclusionFilter =
    answeredIds.length > 0
      ? `AND id NOT IN (${answeredIds.map(() => `$${p++}`).join(",")})`
      : "";
  params.push(...answeredIds);

  params.push(remaining);
  const limitClause = `LIMIT $${p}`;

  const { rows: questions } = await db.query(
    `SELECT id, question, answer_type, options_json, answer, follow_up_context
     FROM trivia_questions
     WHERE active = 1 ${categoryFilter} ${exclusionFilter}
     ORDER BY RANDOM()
     ${limitClause}`,
    params
  );

  const parsed = questions.map((q) => ({
    ...q,
    options: JSON.parse(q.options_json),
    options_json: undefined,
  }));

  return NextResponse.json({ questions: parsed, remaining });
}
