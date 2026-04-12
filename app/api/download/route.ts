import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Only allow our GCS bucket
  const bucket = process.env.GCS_BUCKET ?? "adelina-game-media";
  if (!url.startsWith(`https://storage.googleapis.com/${bucket}/`)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const res = await fetch(url);
  if (!res.ok) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const contentType = res.headers.get("content-type") ?? "application/octet-stream";
  const filename = url.split("/").pop() ?? "download";

  return new Response(res.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
