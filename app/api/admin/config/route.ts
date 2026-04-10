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
  const { rows } = await db.query("SELECT key, value FROM config");
  const config = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return NextResponse.json({ config });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const db = await getDb();

  for (const [key, value] of Object.entries(body)) {
    if (typeof key === "string" && typeof value === "string") {
      await db.query(
        "INSERT INTO config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [key, value]
      );
    }
  }

  return NextResponse.json({ ok: true });
}
