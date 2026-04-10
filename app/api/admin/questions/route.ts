import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const db = await getDb();
  const { rows } = category
    ? await db.query("SELECT * FROM trivia_questions WHERE category = $1 ORDER BY id", [category])
    : await db.query("SELECT * FROM trivia_questions ORDER BY category, id");

  return NextResponse.json({ questions: rows });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { category, question, answer, answer_type, options, follow_up_context, tags } = body;

  if (!category || !question || !answer || !answer_type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const db = await getDb();
  const { rows } = await db.query(
    `INSERT INTO trivia_questions (category, question, answer, answer_type, options_json, follow_up_context, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [category, question, answer, answer_type, JSON.stringify(options ?? []), follow_up_context ?? null, tags ?? ""]
  );

  return NextResponse.json({ id: rows[0].id });
}
