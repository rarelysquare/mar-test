"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";

interface DebugPanelProps {
  isNight: boolean;
  onNightChange: (night: boolean) => void;
  illustrations: string[];
  illustrationIndex: number;
  onIllustrationChange: (index: number) => void;
  playerSlug: string | null;
  onSessionReset: () => void;
}

export function DebugPanel({
  isNight,
  onNightChange,
  illustrations,
  illustrationIndex,
  onIllustrationChange,
  playerSlug,
  onSessionReset,
}: DebugPanelProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [resetting, setResetting] = useState(false);

  if (!session) return null;

  async function resetToday() {
    if (!playerSlug) return;
    setResetting(true);
    // Look up player ID from slug via status endpoint data — use admin reset endpoint instead
    const res = await fetch("/api/admin/debug/reset-today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: playerSlug }),
    });
    if (res.ok) onSessionReset();
    setResetting(false);
  }

  function applyQuestion() {
    const id = questionInput.trim();
    if (!id) { sessionStorage.removeItem("testQuestionId"); return; }
    sessionStorage.setItem("testQuestionId", id);
    alert(`Question ${id} will be shown next time you start the question flow. Navigate to Play to test.`);
  }

  function clearQuestion() {
    sessionStorage.removeItem("testQuestionId");
    setQuestionInput("");
  }

  const illName = illustrations[illustrationIndex]?.split("/").pop()?.replace("adelina-", "").replace(".png", "") ?? "—";

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs">
      {open ? (
        <div className="bg-gray-900 text-green-400 rounded-xl shadow-2xl w-64 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white">🧪 Debug</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">✕</button>
          </div>

          {/* Time */}
          <div className="space-y-1">
            <p className="text-gray-400 uppercase tracking-wider text-[10px]">Time of day</p>
            <div className="flex gap-2">
              <button
                onClick={() => onNightChange(false)}
                className={`flex-1 py-1 rounded ${!isNight ? "bg-yellow-400 text-gray-900 font-bold" : "bg-gray-700 text-gray-300"}`}
              >
                ☀️ Day
              </button>
              <button
                onClick={() => onNightChange(true)}
                className={`flex-1 py-1 rounded ${isNight ? "bg-indigo-500 text-white font-bold" : "bg-gray-700 text-gray-300"}`}
              >
                🌙 Night
              </button>
            </div>
          </div>

          {/* Illustration */}
          <div className="space-y-1">
            <p className="text-gray-400 uppercase tracking-wider text-[10px]">Illustration</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onIllustrationChange((illustrationIndex - 1 + illustrations.length) % illustrations.length)}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
              >‹</button>
              <span className="flex-1 text-center truncate text-white">{illName}</span>
              <button
                onClick={() => onIllustrationChange((illustrationIndex + 1) % illustrations.length)}
                className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
              >›</button>
            </div>
            <p className="text-gray-500 text-[10px] text-center">{illustrationIndex + 1} / {illustrations.length}</p>
          </div>

          {/* Question override */}
          <div className="space-y-1">
            <p className="text-gray-400 uppercase tracking-wider text-[10px]">Question ID override</p>
            <div className="flex gap-1">
              <input
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="e.g. 42"
                className="flex-1 bg-gray-800 text-white px-2 py-1 rounded text-xs w-0"
              />
              <button onClick={applyQuestion} className="bg-green-700 hover:bg-green-600 px-2 py-1 rounded">Set</button>
              <button onClick={clearQuestion} className="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded">✕</button>
            </div>
            {typeof window !== "undefined" && sessionStorage.getItem("testQuestionId") && (
              <p className="text-yellow-400 text-[10px]">Active override: Q{sessionStorage.getItem("testQuestionId")}</p>
            )}
          </div>

          {/* Session reset */}
          <div className="space-y-1">
            <p className="text-gray-400 uppercase tracking-wider text-[10px]">Session</p>
            <button
              onClick={resetToday}
              disabled={resetting || !playerSlug}
              className="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 text-white py-1 rounded"
            >
              {resetting ? "Resetting…" : "↺ Reset today's session"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-gray-900 text-green-400 w-9 h-9 rounded-full shadow-lg text-base flex items-center justify-center hover:bg-gray-700"
        >
          🧪
        </button>
      )}
    </div>
  );
}
