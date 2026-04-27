"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlameIcon } from "../components/SoftIcons";
import { DevReset } from "../components/DevReset";
import { SaveMediaButton } from "../components/SaveMediaButton";

const FALLBACK_DAY = ["standing","crawling-bunny","holding-donut","crawling-grass","sitting-crawl","playing-sand","sitting-happy","pointing","laptop","happy-back","playing-mat","tummy-bunny"];
const FALLBACK_NIGHT = ["sleeping-back","sleeping-side","sleeping-tummy"];

function pickIllustration(urls: string[]) {
  if (!urls.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  return urls[day % urls.length];
}

function fallbackIllustration() {
  const isNight = new Date().getHours() >= 19;
  const pool = isNight ? FALLBACK_NIGHT : FALLBACK_DAY;
  const day = Math.floor(Date.now() / 86400000);
  return `/illustrations/adelina-${pool[day % pool.length]}.png`;
}

interface Status {
  player: { name: string; current_streak: number; total_points: number };
  days_played: number;
  completed: boolean;
  media_url: string | null;
  media_type: "video" | "photo" | null;
}

function ShareButton() {
  async function handleShare() {
    const url = window.location.origin;
    if (navigator.share) {
      navigator.share({ title: "Baby Adelina Trivia", url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  }

  return (
    <button
      onClick={handleShare}
      className="w-full max-w-[300px] mx-auto flex items-center justify-center gap-2 bg-brand-50 border border-brand-200 text-brand-600 font-semibold py-3 rounded-2xl text-sm transition hover:bg-brand-100"
    >
      📤 Share Adelina&apos;s game
    </button>
  );
}

export default function PlayPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [illustrationUrl, setIllustrationUrl] = useState<string | null>(null);

  useEffect(() => {
    const slug = localStorage.getItem("playerSlug");
    if (!slug) { router.replace("/"); return; }

    const isNight = new Date().getHours() >= 19;

    const tz = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
    Promise.all([
      fetch(`/api/game/status?slug=${slug}&tz=${tz}`).then((r) => r.json()),
      fetch("/api/game/illustrations").then((r) => r.json()),
    ]).then(([statusData, illData]) => {
      if (statusData.error) { router.replace("/"); return; }
      setStatus(statusData);
      const allUrls: string[] = (illData.illustrations ?? []).map((i: { url: string }) => i.url);
      const nightUrls = allUrls.filter((u) => FALLBACK_NIGHT.some((n) => u.includes(n)));
      const dayUrls = allUrls.filter((u) => !FALLBACK_NIGHT.some((n) => u.includes(n)));
      const pool = isNight ? nightUrls : dayUrls;
      setIllustrationUrl(pickIllustration(pool) ?? fallbackIllustration());
    }).finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex items-center justify-center">
      <p className="text-brand-400">Loading…</p>
    </main>
  );

  if (!status) return null;

  const { player, days_played, completed, media_url, media_type } = status;
  const isNight = new Date().getHours() >= 19;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50">
      <div className="max-w-md mx-auto px-4 pt-10 pb-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={illustrationUrl ?? fallbackIllustration()}
            alt="Adelina"
            className="w-[85%] max-w-[240px] h-auto mx-auto object-contain"
          />
          <p className="text-xl leading-relaxed text-brand-400">
            {completed ? "Thanks for playing" : (isNight ? "Good evening" : "Welcome back")}, {player.name}
          </p>
          {player.current_streak > 1 && (
            <p className="text-sm text-blush-400 font-medium flex items-center justify-center gap-1">
              <FlameIcon className="w-4 h-4" />
              {player.current_streak} day streak
            </p>
          )}
        </div>

        {/* Daily status / share */}
        {completed ? (
          days_played < 3 && <ShareButton />
        ) : (
          (player.total_points > 0 || player.current_streak > 0) && (
            <div className="rounded-2xl px-4 py-3 text-sm text-center font-medium text-brand-400">
              Today's question is waiting for you
            </div>
          )
        )}

        {completed ? (
          /* ── Completed state ── */
          <div className="space-y-4">
            {media_url ? (
              <>
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

                <SaveMediaButton
                  mediaUrl={media_url}
                  mediaType={media_type ?? "photo"}
                  className="flex items-center justify-center gap-2 w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold text-center py-3 rounded-xl transition"
                />
                {days_played >= 3 && <ShareButton />}
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
            className="w-full max-w-[300px] mx-auto block bg-brand-500 hover:bg-brand-600 text-white font-semibold py-5 rounded-2xl text-base leading-normal transition active:scale-95 shadow-sm"
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
