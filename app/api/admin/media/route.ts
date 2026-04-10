import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL;
}

const storage = new Storage();

export async function GET() {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const { rows } = await db.query("SELECT * FROM media_items ORDER BY uploaded_at DESC");

  const mediaBase = process.env.MEDIA_BASE_URL ?? "";
  const items = rows.map((item) => ({
    ...item,
    url: `${mediaBase}/${item.type === "photo" ? "photos" : "videos"}/${item.filename}`,
  }));

  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, tags, description } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = await getDb();
  await db.query(
    "UPDATE media_items SET tags = $1, description = $2 WHERE id = $3",
    [tags ?? "", description ?? "", id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await req.json();
  if (!filename || typeof filename !== "string") {
    return NextResponse.json({ error: "filename required" }, { status: 400 });
  }

  const db = await getDb();
  const { rows } = await db.query(
    "SELECT type FROM media_items WHERE filename = $1",
    [filename]
  );
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const subdir = rows[0].type === "photo" ? "photos" : "videos";
  try {
    await storage.bucket(process.env.GCS_BUCKET!).file(`${subdir}/${filename}`).delete();
  } catch {
    // file might already be gone
  }

  await db.query("DELETE FROM media_items WHERE filename = $1", [filename]);
  return NextResponse.json({ ok: true });
}
