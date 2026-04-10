"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { TagInput } from "@/app/components/TagInput";

interface MediaItem {
  id: number;
  filename: string;
  original_name: string;
  type: "photo" | "video";
  mime_type: string;
  size: number;
  uploaded_at: string;
  used_on: string | null;
  tags: string;
  description: string;
  url: string;
}

interface UploadFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MediaPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [queue, setQueue] = useState<UploadFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState<"all" | "photo" | "video">("all");
  const [preview, setPreview] = useState<{ url: string; type: "photo" | "video"; name: string; item: MediaItem } | null>(null);
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editDesc, setEditDesc] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  async function loadMedia() {
    const res = await fetch("/api/admin/media");
    if (res.ok) {
      const { items } = await res.json();
      setItems(items);
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      loadMedia();
      fetch("/api/admin/tags").then((r) => r.json()).then((d) => setAllTags(d.tags ?? []));
    }
  }, [status]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    setQueue((q) => [
      ...q,
      ...arr.map((file) => ({ file, status: "pending" as const })),
    ]);
  }, []);

  // Process upload queue sequentially
  useEffect(() => {
    if (uploadingRef.current) return;
    const pending = queue.find((f) => f.status === "pending");
    if (!pending) return;

    uploadingRef.current = true;

    (async () => {
      setQueue((q) =>
        q.map((f) => (f === pending ? { ...f, status: "uploading" } : f))
      );

      const formData = new FormData();
      formData.append("files", pending.file);

      try {
        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        const hasError = data.errors?.length > 0;

        setQueue((q) =>
          q.map((f) =>
            f === pending
              ? {
                  ...f,
                  status: hasError ? "error" : "done",
                  error: hasError ? data.errors[0] : undefined,
                }
              : f
          )
        );

        if (!hasError) loadMedia();
      } catch {
        setQueue((q) =>
          q.map((f) =>
            f === pending ? { ...f, status: "error", error: "Upload failed" } : f
          )
        );
      } finally {
        uploadingRef.current = false;
      }
    })();
  }, [queue]);

  async function deleteItem(filename: string) {
    if (!confirm("Delete this file?")) return;
    await fetch("/api/admin/media", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename }),
    });
    loadMedia();
  }

  const filtered = items.filter((i) => filter === "all" || i.type === filter);
  const doneCount = queue.filter((f) => f.status === "done").length;
  const totalCount = queue.length;
  const uploading = queue.some((f) => f.status === "uploading");

  if (status === "loading") return <p className="p-8">Loading…</p>;

  return (
    <main className="min-h-screen bg-brand-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin")}
            className="text-sm text-gray-500 hover:text-brand-600"
          >
            ← Admin
          </button>
          <h1 className="text-2xl font-bold text-brand-700">Media Library</h1>
          <span className="text-sm text-gray-400 ml-auto">
            {items.length} file{items.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition ${
            dragging
              ? "border-brand-500 bg-brand-100"
              : "border-gray-300 hover:border-brand-400 hover:bg-brand-50"
          }`}
        >
          <p className="text-lg font-medium text-gray-600">
            Drop photos & videos here
          </p>
          <p className="text-sm text-gray-400 mt-1">
            or click to browse — JPG, PNG, HEIC, MP4, MOV and more
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* Upload queue */}
        {queue.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-sm text-gray-600">
                Uploading {doneCount}/{totalCount}
                {uploading && " …"}
              </h2>
              {!uploading && (
                <button
                  onClick={() => setQueue([])}
                  className="text-xs text-gray-400 hover:text-red-400"
                >
                  Clear
                </button>
              )}
            </div>
            {queue.map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    f.status === "done"
                      ? "bg-green-400"
                      : f.status === "error"
                      ? "bg-red-400"
                      : f.status === "uploading"
                      ? "bg-yellow-400 animate-pulse"
                      : "bg-gray-300"
                  }`}
                />
                <span className="truncate flex-1 text-gray-700">{f.file.name}</span>
                <span className="text-gray-400 flex-shrink-0">{formatBytes(f.file.size)}</span>
                {f.error && <span className="text-red-500 text-xs">{f.error}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(["all", "photo", "video"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === t
                  ? "bg-brand-600 text-white"
                  : "bg-white text-gray-500 hover:bg-brand-50"
              }`}
            >
              {t === "all" ? "All" : t === "photo" ? "Photos" : "Videos"}
            </button>
          ))}
        </div>

        {/* Gallery */}
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No files yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map((item) => {
              const url = item.url;
              return (
                <div
                  key={item.id}
                  className="group relative bg-white rounded-xl overflow-hidden shadow aspect-square cursor-pointer"
                  onClick={() => {
                    setPreview({ url, type: item.type, name: item.original_name, item });
                    setEditTags((item.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean));
                    setEditDesc(item.description ?? "");
                  }}
                >
                  {item.type === "photo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={item.original_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteItem(item.filename); }}
                      className="self-end bg-red-500 text-white text-xs px-2 py-1 rounded-lg"
                    >
                      Delete
                    </button>
                    <div>
                      <p className="text-white text-xs truncate">{item.original_name}</p>
                      <p className="text-white/70 text-xs">{formatBytes(item.size)}</p>
                    </div>
                  </div>

                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-black/50 rounded-full w-10 h-10 flex items-center justify-center group-hover:bg-black/70 transition">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="relative max-w-2xl w-full flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreview(null)}
              className="absolute -top-8 right-0 text-white/70 hover:text-white text-sm z-10"
            >
              ✕ Close
            </button>

            {preview.type === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.name} className="w-full rounded-xl max-h-[50vh] object-contain flex-shrink-0" />
            ) : (
              <video src={preview.url} controls autoPlay playsInline className="w-full rounded-xl max-h-[50vh] flex-shrink-0" />
            )}

            <div className="overflow-y-auto space-y-3 mt-3">

            <p className="text-white/60 text-xs text-center">{preview.name}</p>

            {/* Tag + description editor */}
            <div className="bg-white/10 rounded-xl p-4 space-y-3">
              <div>
                <label className="text-white/70 text-xs font-medium block mb-1">
                  Description <span className="text-white/40">(what's happening in this video)</span>
                </label>
                <input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="e.g. Adelina doing tummy time on the play mat"
                  className="w-full bg-white/20 text-white placeholder-white/30 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/50"
                />
              </div>
              <div>
                <label className="text-white/70 text-xs font-medium block mb-1">
                  Tags <span className="text-white/40">(Enter or comma to add · click × to remove)</span>
                </label>
                <TagInput
                  value={editTags}
                  onChange={(tags) => { setEditTags(tags); setAllTags((prev) => [...new Set([...prev, ...tags])]); }}
                  suggestions={allTags}
                  placeholder="tummy-time, laughing…"
                  dark
                />
              </div>
              <button
                disabled={savingMeta}
                onClick={async () => {
                  setSavingMeta(true);
                  await fetch("/api/admin/media", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: preview.item.id, tags: editTags.join(", "), description: editDesc }),
                  });
                  setSavingMeta(false);
                  loadMedia();
                }}
                className="bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                {savingMeta ? "Saving…" : "Save"}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
