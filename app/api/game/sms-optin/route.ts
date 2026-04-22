import { getDb } from "@/lib/db/client";
import { NextResponse } from "next/server";

function cleanPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function POST(req: Request) {
  const { slug, phone } = await req.json();
  if (!slug || !phone) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const cleaned = cleanPhone(phone);
  if (!cleaned) return NextResponse.json({ error: "Invalid phone number — please enter a 10-digit US number" }, { status: 400 });

  const db = await getDb();
  const { rows } = await db.query("SELECT id FROM players WHERE slug = $1", [slug]);
  if (!rows.length) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  await db.query(
    "UPDATE players SET phone_number = $1, sms_opted_in = 1 WHERE slug = $2",
    [cleaned, slug]
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const db = await getDb();
  await db.query(
    "UPDATE players SET sms_opted_in = 0 WHERE slug = $1",
    [slug]
  );

  return NextResponse.json({ ok: true });
}
