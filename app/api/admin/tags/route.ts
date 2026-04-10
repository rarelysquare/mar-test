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
    "SELECT tags FROM media_items UNION ALL SELECT tags FROM trivia_questions"
  );

  const tagSet = new Set<string>();
  for (const { tags } of rows) {
    for (const t of (tags ?? "").split(",")) {
      const trimmed = t.trim().toLowerCase();
      if (trimmed) tagSet.add(trimmed);
    }
  }

  return NextResponse.json({ tags: [...tagSet].sort() });
}
