import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { category, question, answer, answer_type, options, follow_up_context, active, tags } = body;

  const db = await getDb();
  await db.query(
    `UPDATE trivia_questions SET
      category = COALESCE($1, category),
      question = COALESCE($2, question),
      answer = COALESCE($3, answer),
      answer_type = COALESCE($4, answer_type),
      options_json = COALESCE($5, options_json),
      follow_up_context = $6,
      active = COALESCE($7, active),
      tags = COALESCE($8, tags),
      updated_at = to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
     WHERE id = $9`,
    [
      category ?? null,
      question ?? null,
      answer ?? null,
      answer_type ?? null,
      options !== undefined ? JSON.stringify(options) : null,
      follow_up_context ?? null,
      active !== undefined ? (active ? 1 : 0) : null,
      tags !== undefined ? tags : null,
      id,
    ]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const db = await getDb();
  await db.query("DELETE FROM trivia_questions WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
