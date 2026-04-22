import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { NextResponse } from "next/server";

function isAdmin(email?: string | null) {
  return email === process.env.ADMIN_EMAIL;
}

async function sendSms(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!sid || !token || !from) throw new Error("Twilio env vars not configured");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }).toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? "Twilio error");
  }
}

export async function POST() {
  const session = await auth();
  if (!session || !isAdmin(session.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  const { rows } = await db.query(
    "SELECT name, phone_number FROM players WHERE sms_opted_in = 1 AND phone_number IS NOT NULL"
  );

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No players opted in" });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "";
  const results: { name: string; ok: boolean; error?: string }[] = [];

  for (const p of rows) {
    try {
      await sendSms(
        p.phone_number,
        `Hi ${p.name}! 🎀 Today's Adelina trivia question is ready. Play here: ${appUrl}/play`
      );
      results.push({ name: p.name, ok: true });
    } catch (e) {
      results.push({ name: p.name, ok: false, error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, sent: results.filter((r) => r.ok).length, results });
}
