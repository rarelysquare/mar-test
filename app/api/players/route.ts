import { getDb } from "@/lib/db/client";
import { nameToSlug } from "@/lib/game";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const trimmed = name.trim();
  const db = await getDb();

  const existing = await db.query(
    "SELECT slug FROM players WHERE LOWER(name) = LOWER($1)",
    [trimmed]
  );
  if (existing.rows.length) {
    return NextResponse.json(
      { error: "That name is already taken — try adding your last initial!" },
      { status: 409 }
    );
  }

  let slug = nameToSlug(trimmed);
  let counter = 1;
  while ((await db.query("SELECT id FROM players WHERE slug = $1", [slug])).rows.length) {
    slug = `${nameToSlug(trimmed)}-${counter++}`;
  }

  await db.query("INSERT INTO players (name, slug) VALUES ($1, $2)", [trimmed, slug]);
  return NextResponse.json({ slug, name: trimmed });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const db = await getDb();
  const { rows } = await db.query("SELECT * FROM players WHERE slug = $1", [slug]);
  if (!rows.length) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  return NextResponse.json({ player: rows[0] });
}
