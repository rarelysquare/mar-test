"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlameIcon } from "../components/SoftIcons";
import { DevReset } from "../components/DevReset";

const DAY_ILLUSTRATIONS = [
  "standing", "crawling-bunny", "holding-donut", "crawling-grass",
  "sitting-crawl", "playing-sand", "sitting-happy", "pointing",
  "laptop", "happy-back", "playing-mat", "tummy-bunny",
];
const NIGHT_ILLUSTRATIONS = ["sleeping-back", "sleeping-side", "sleeping-tummy"];

function getDailyIllustration() {
  const now = new Date();
  const isNight = now.getHours() >= 19;
  const pool = isNight ? NIGHT_ILLUSTRATIONS : DAY_ILLUSTRATIONS;
  const day = Math.floor(Date.now() / 86400000);
  return pool[day % pool.length];
}

interface Status {
  player: { name: string; current_streak: number; total_points: number };
  completed: boolean;
  media_url: string | null;
  media_type: "video" | "photo" | null;
}

export default function PlayPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const slug = localStorage.getItem("playerSlug");
    if (!slug) { router.replace("/"); return; }

    fetch(`/api/game/status?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.replace("/"); return; }
        setStatus(data);
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex items-center justify-center">
      <p className="text-brand-400">Loading…</p>
    </main>
  );

  if (!status) return null;

  const { player, completed, media_url, media_type } = status;
  const isNight = new Date().getHours() >= 19;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50">
      <div className="max-w-sm mx-auto px-4 pt-10 pb-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/illustrations/adelina-${getDailyIllustration()}.png`}
            alt="Adelina"
            className="w-28 h-28 mx-auto object-contain"
          />
          <p className="text-sm text-brand-400">
            {isNight ? "Good evening" : "Welcome back"},
          </p>
          <h1 className="text-2xl font-bold text-brand-700">{player.name}</h1>
          {player.current_streak > 1 && (
            <p className="text-sm text-blush-400 font-medium flex items-center justify-center gap-1">
              <FlameIcon className="w-4 h-4" />
              {player.current_streak} day streak
            </p>
          )}
        </div>

        {/* Daily status pill */}
        <div className={`rounded-2xl px-4 py-3 text-sm text-center font-medium border ${
          completed
            ? "bg-brand-50 border-brand-200 text-brand-600"
            : "bg-cream-50 border-brand-100 text-brand-400"
        }`}>
          {completed ? "✓ Today's question complete" : "Today's question is waiting for you"}
        </div>

        {completed ? (
          /* ── Completed state ── */
          <div className="space-y-4">
            {media_url ? (
              <>
                <div className="text-center space-y-1">
                  <p className="text-2xl">🎀</p>
                  <p className="font-semibold text-brand-700">
                    {media_type === "photo" ? "Today's memory" : "Today's video"}
                  </p>
                </div>

                {media_type === "video" ? (
                  <video
                    src={media_url}
                    controls
                    playsInline
                    className="w-full rounded-2xl shadow-lg"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={media_url}
                    alt="Today's memory"
                    className="w-full rounded-2xl shadow-lg object-contain"
                  />
                )}

                <a
                  href={`/api/download?url=${encodeURIComponent(media_url)}`}
                  download
                  className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold text-center py-3 rounded-xl transition"
                >
                  ⬇ {media_type === "photo" ? "Download photo" : "Download video"}
                </a>
              </>
            ) : (
              <p className="text-center text-brand-400 text-sm py-4">
                Come back tomorrow for your next question.
              </p>
            )}
          </div>
        ) : (
          /* ── Not yet played state ── */
          <button
            onClick={() => router.push("/play/daily")}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-5 rounded-2xl text-lg transition active:scale-95 shadow-sm"
          >
            Play today&apos;s question
          </button>
        )}

        <p className="text-center text-xs text-brand-300">
          {player.total_points} total point{player.total_points !== 1 ? "s" : ""}
        </p>
        <div className="text-center">
          <DevReset />
        </div>
      </div>
    </main>
  );
}
