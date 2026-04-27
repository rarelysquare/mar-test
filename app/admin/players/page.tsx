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
  const [addSessions, setAddSessions] = useState<Record<number, string>>({});

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

  async function handleResetToday(id: number) {
    await fetch(`/api/admin/players/${id}/reset-today`, { method: "DELETE" });
    load();
  }

  async function handleAddSessions(id: number) {
    const count = parseInt(addSessions[id] ?? "1", 10);
    if (!count || count < 1) return;
    await fetch(`/api/admin/players/${id}/add-sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ count }),
    });
    setAddSessions((prev) => ({ ...prev, [id]: "" }));
    load();
  }

  function playAs(slug: string) {
    localStorage.setItem("playerSlug", slug);
    window.open("/play", "_blank");
  }

  if (status === "loading") return <p className="p-8">Loading…</p>;

  return (
    <main className="min-h-screen bg-brand-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="text-sm text-gray-500 hover:text-brand-600">
            ← Admin
          </button>
          <h1 className="text-2xl font-bold text-brand-700">Players</h1>
          <span className="text-sm text-gray-400 ml-auto">{players.length} players</span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 space-y-1">
          <p className="font-semibold">Testing tools</p>
          <p><strong>▶ Play as</strong> — opens /play in a new tab as that player (your admin session stays open).</p>
          <p><strong>↺ Reset today</strong> — deletes today&apos;s session so the player can answer again.</p>
          <p><strong>+ N sessions</strong> — inserts N dummy past sessions to simulate an experienced player.</p>
        </div>

        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        ) : players.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No players yet.</p>
        ) : (
          <div className="space-y-3">
            {players.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
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

                {/* Testing controls */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => playAs(p.slug)}
                    className="text-xs bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 rounded-lg"
                  >
                    ▶ Play as
                  </button>
                  <button
                    onClick={() => handleResetToday(p.id)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg"
                  >
                    ↺ Reset today
                  </button>
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-gray-400">Add</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={addSessions[p.id] ?? ""}
                      onChange={(e) => setAddSessions((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      placeholder="N"
                      className="w-12 border rounded px-1.5 py-1 text-xs text-center"
                    />
                    <span className="text-xs text-gray-400">past days</span>
                    <button
                      onClick={() => handleAddSessions(p.id)}
                      className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
