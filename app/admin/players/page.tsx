"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Player {
  id: number;
  name: string;
  slug: string;
  current_streak: number;
  total_points: number;
  created_at: string;
  days_played: number;
}

export default function PlayersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/players");
    if (res.ok) {
      const data = await res.json();
      setPlayers(data.players);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete player "${name}"? This removes all their game history.`)) return;
    await fetch("/api/admin/players", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (status === "loading") return <p className="p-8">Loading…</p>;

  return (
    <main className="min-h-screen bg-brand-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm text-gray-500 hover:text-brand-600"
          >
            ← Admin
          </button>
          <h1 className="text-2xl font-bold text-brand-700">Players</h1>
          <span className="text-sm text-gray-400 ml-auto">{players.length} players</span>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        ) : players.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No players yet.</p>
        ) : (
          <div className="space-y-3">
            {players.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-brand-700">{p.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {p.days_played} day{p.days_played !== 1 ? "s" : ""} played
                    {" · "}{p.total_points} pt{p.total_points !== 1 ? "s" : ""}
                    {p.current_streak > 1 ? ` · 🔥 ${p.current_streak} streak` : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
