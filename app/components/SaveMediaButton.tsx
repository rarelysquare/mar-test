"use client";
import { useState } from "react";

interface Props {
  mediaUrl: string;
  mediaType: "photo" | "video";
  className?: string;
}

export function SaveMediaButton({ mediaUrl, mediaType, className }: Props) {
  const [saving, setSaving] = useState(false);

  const label = mediaType === "photo" ? "Save photo" : "Save video";
  const ext = mediaType === "photo" ? "jpg" : "mp4";
  const filename = `adelina-${new Date().toISOString().slice(0, 10)}.${ext}`;

  async function handleSave() {
    setSaving(true);
    try {
      // Try Web Share API (iOS/Android share sheet → "Save to Photos")
      if (typeof navigator !== "undefined" && navigator.canShare) {
        const res = await fetch(`/api/download?url=${encodeURIComponent(mediaUrl)}`);
        const blob = await res.blob();
        const file = new File([blob], filename, { type: blob.type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "Adelina" });
          setSaving(false);
          return;
        }
      }
    } catch {
      // User cancelled share or API unavailable — fall through to download
    }

    // Fallback: trigger browser download
    const a = document.createElement("a");
    a.href = `/api/download?url=${encodeURIComponent(mediaUrl)}`;
    a.download = filename;
    a.click();
    setSaving(false);
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className={className}
    >
      {saving ? "Preparing…" : `⬇ ${label}`}
    </button>
  );
}
