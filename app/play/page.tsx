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
  questions_remaining: number;
}

export default function PlayPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    const slug = localStorage.getItem("playerSlug");
    if (!slug) { router.replace("/"); return; }

    fetch(`/api/game/status?slug=${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.replace("/"); return; }
        if (data.questions_remaining > 0) {
          router.replace("/play/daily");
        } else {
          setStatus(data);
        }
      });
  }, [router]);

  if (!status) return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex items-center justify-center">
      <p className="text-brand-400">Loading…</p>
    </main>
  );

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
          <p className="text-sm text-brand-400">Welcome back</p>
          <h1 className="text-2xl font-bold text-brand-700">
            {status.player.name}
          </h1>
          {status.player.current_streak > 1 && (
            <p className="text-sm text-blush-400 font-medium flex items-center justify-center gap-1">
              <FlameIcon className="w-4 h-4" />
              {status.player.current_streak} day streak
            </p>
          )}
        </div>

        <div className="text-center space-y-1 py-4">
          <p className="font-semibold text-brand-700">All done for today!</p>
          <p className="text-sm text-brand-400">Come back tomorrow for your next question.</p>
        </div>

        <p className="text-center text-xs text-brand-300">
          {status.player.total_points} total points
        </p>
        <div className="text-center">
          <DevReset />
        </div>
      </div>
    </main>
  );
}
