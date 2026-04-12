"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdelinaIcon } from "./components/AdelinaIcon";

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

export default function LandingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);

  // If player already registered, go straight to /play
  useEffect(() => {
    const slug = localStorage.getItem("playerSlug");
    if (slug) {
      fetch(`/api/players?slug=${slug}`)
        .then((r) => (r.ok ? router.replace("/play") : null))
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }

    localStorage.setItem("playerSlug", data.slug);
    localStorage.setItem("playerName", data.name);
    router.push("/play");
  }

  if (checking) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/illustrations/adelina-${getDailyIllustration()}.png`}
            alt="Adelina"
            className="w-40 h-40 mx-auto object-contain"
          />
          <h1 className="text-3xl font-bold text-brand-700">Baby Adelina Trivia</h1>
          <p className="text-brand-600/70 text-base">
            One question a day about babies, development, and Adelina herself — plus a daily photo or video reward.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1 text-left">
            <label className="text-sm font-medium text-brand-700">
              What should we call you?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grandma Sue"
              maxLength={40}
              className="w-full border border-brand-200 rounded-2xl px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-brand-300 bg-cream-50 text-brand-800 placeholder-brand-300"
              autoFocus
            />
            {error && <p className="text-blush-400 text-sm">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl text-base transition shadow-sm"
          >
            {loading ? "Just a sec…" : "Let's play!"}
          </button>
        </form>

        <p className="text-xs text-brand-400">
          No account needed. Just your name.
        </p>
      </div>
    </main>
  );
}
