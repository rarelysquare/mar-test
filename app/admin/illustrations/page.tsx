"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ILLUSTRATIONS = [
  "standing", "crawling-bunny", "holding-donut", "crawling-grass",
  "sitting-crawl", "playing-sand", "sitting-happy", "pointing",
  "laptop", "happy-back", "playing-mat", "tummy-bunny",
  "sleeping-back", "sleeping-side", "sleeping-tummy",
];

export default function IllustrationsPage() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  if (status === "loading") return <p className="p-8">Loading…</p>;

  return (
    <main className="min-h-screen bg-brand-50 p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm text-gray-500 hover:text-brand-600"
          >
            ← Admin
          </button>
          <h1 className="text-2xl font-bold text-brand-700">Illustrations</h1>
          <span className="text-sm text-gray-400 ml-auto">{ILLUSTRATIONS.length} images</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
          {ILLUSTRATIONS.map((name) => (
            <div key={name} className="bg-white rounded-2xl shadow p-3 flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/illustrations/adelina-${name}.png`}
                alt={name}
                className="w-24 h-24 object-contain"
              />
              <p className="text-xs text-gray-500 text-center">{name}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
