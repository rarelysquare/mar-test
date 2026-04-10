import { getDb } from "@/lib/db/client";
import { pickVideoByTags } from "@/lib/game";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const questionIds = searchParams.get("question_ids");

  const db = await getDb();
  const { rows: videos } = await db.query(
    "SELECT id, filename, tags FROM media_items WHERE type = 'video'"
  );

  if (!videos.length) return NextResponse.json({ url: null });

  let questionTagSet = new Set<string>();
  if (questionIds) {
    const ids = questionIds.split(",").map(Number).filter(Boolean);
    if (ids.length) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
      const { rows: questions } = await db.query(
        `SELECT tags FROM trivia_questions WHERE id IN (${placeholders})`,
        ids
      );
      questionTagSet = new Set(
        questions.flatMap((q: { tags: string }) =>
          q.tags.split(",").map((t: string) => t.trim().toLowerCase()).filter(Boolean)
        )
      );
    }
  }

  const chosen = pickVideoByTags(videos, questionTagSet);
  const mediaBase = process.env.MEDIA_BASE_URL ?? "";
  return NextResponse.json({
    url: chosen ? `${mediaBase}/videos/${chosen.filename}` : null,
  });
}
