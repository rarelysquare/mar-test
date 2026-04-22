"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [exhaustedAlert, setExhaustedAlert] = useState<string | null>(null);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/admin/config")
        .then((r) => r.json())
        .then((d) => {
          const alert = d.config?.alert_questions_exhausted;
          if (alert) setExhaustedAlert(alert);
        });
    }
  }, [status]);

  if (status === "loading") return <p className="p-8">Loading…</p>;

  return (
    <main className="min-h-screen bg-brand-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-brand-700">Baby Trivia — Admin</h1>
          <button
            onClick={() => signOut({ redirectTo: "/admin/login" })}
            className="text-sm text-gray-500 hover:text-red-500"
          >
            Sign out
          </button>
        </div>

        <p className="text-sm text-gray-600">
          Signed in as <strong>{session?.user?.email}</strong>
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={async () => {
              setSendingReminders(true);
              setReminderResult(null);
              const res = await fetch("/api/admin/send-reminders", { method: "POST" });
              const data = await res.json();
              setReminderResult(data.message ?? `Sent to ${data.sent} player${data.sent !== 1 ? "s" : ""}`);
              setSendingReminders(false);
            }}
            disabled={sendingReminders}
            className="bg-brand-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {sendingReminders ? "Sending…" : "Send daily reminders"}
          </button>
          {reminderResult && <p className="text-sm text-gray-500">{reminderResult}</p>}
        </div>

        {exhaustedAlert && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-semibold text-red-700">⚠️ Questions exhausted</p>
            <p className="text-xs text-red-600 whitespace-pre-wrap">{exhaustedAlert.split(" | ").join("\n")}</p>
            <p className="text-xs text-red-400">Add more questions in the Question Bank to fix this.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          <button
            onClick={() => router.push("/admin/media")}
            className="bg-white rounded-2xl shadow p-6 text-left hover:shadow-md transition"
          >
            <h2 className="font-semibold text-lg text-brand-700">Media Library</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload and manage photos and videos for the daily game.
            </p>
          </button>
          <button
            onClick={() => router.push("/admin/questions")}
            className="bg-white rounded-2xl shadow p-6 text-left hover:shadow-md transition"
          >
            <h2 className="font-semibold text-lg text-brand-700">Question Bank</h2>
            <p className="text-sm text-gray-500 mt-1">
              View, edit, and add trivia questions for Milestone Trivia and Raising Adelina.
            </p>
          </button>
          <button
            onClick={() => router.push("/admin/players")}
            className="bg-white rounded-2xl shadow p-6 text-left hover:shadow-md transition"
          >
            <h2 className="font-semibold text-lg text-brand-700">Players</h2>
            <p className="text-sm text-gray-500 mt-1">
              View and delete player accounts and game history.
            </p>
          </button>
          <button
            onClick={() => router.push("/admin/illustrations")}
            className="bg-white rounded-2xl shadow p-6 text-left hover:shadow-md transition"
          >
            <h2 className="font-semibold text-lg text-brand-700">Illustrations</h2>
            <p className="text-sm text-gray-500 mt-1">
              Browse all Adelina illustration assets.
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}
