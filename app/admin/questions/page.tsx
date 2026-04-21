"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TagInput } from "@/app/components/TagInput";

interface Question {
  id: number;
  category: "milestone_trivia" | "raising_adelina";
  question: string;
  answer: string;
  answer_type: string;
  options_json: string;
  follow_up_context: string | null;
  is_adelina_specific: number;
  active: number;
  tags: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  milestone_trivia: "Milestone Trivia",
  raising_adelina: "Raising Adelina",
};

const TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  select_all: "Select All",
  free_form: "Free Form",
};

function QuestionCard({
  q,
  onSave,
  onDelete,
  allTags,
  onNewTags,
}: {
  q: Question;
  onSave: (id: number, updates: Partial<Question> & { tags?: string; options_json?: string }) => void;
  onDelete: (id: number) => void;
  allTags: string[];
  onNewTags: (tags: string[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(q);
  const [draftTags, setDraftTags] = useState<string[]>(
    (q.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean)
  );
  const [draftOptions, setDraftOptions] = useState<string[]>(
    JSON.parse(q.options_json || "[]")
  );

  function save() {
    onSave(q.id, {
      question: draft.question,
      answer: draft.answer,
      follow_up_context: draft.follow_up_context,
      active: draft.active,
      tags: draftTags.join(", "),
      options_json: JSON.stringify(draftOptions),
    });
    onNewTags(draftTags);
    setEditing(false);
  }

  return (
    <div
      className={`bg-white rounded-2xl shadow p-5 space-y-3 border-l-4 ${
        q.active ? "border-brand-500" : "border-gray-200 opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
            {CATEGORY_LABELS[q.category]}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {TYPE_LABELS[q.answer_type]}
          </span>
          {q.is_adelina_specific ? (
            <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full font-medium">
              Adelina-specific
            </span>
          ) : (
            <span className="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">
              Generic
            </span>
          )}
          <span className="text-xs text-gray-400">#{q.id}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => {
              onSave(q.id, { active: q.active ? 0 : 1 });
            }}
            className="text-xs text-gray-400 hover:text-brand-600"
          >
            {q.active ? "Disable" : "Enable"}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {editing ? "Cancel" : "Edit"}
          </button>
          <button
            onClick={() => {
              if (confirm("Delete this question?")) onDelete(q.id);
            }}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium">Question</label>
            <textarea
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              rows={4}
              className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Correct Answer</label>
            <input
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          {(q.answer_type === "multiple_choice" || q.answer_type === "select_all") && (
            <div>
              <label className="text-xs text-gray-500 font-medium">Answer Options</label>
              <div className="mt-1 space-y-2">
                {draftOptions.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="text-xs text-gray-400 mt-2.5 w-4 flex-shrink-0">{i + 1}.</span>
                    <input
                      value={opt}
                      onChange={(e) => {
                        const updated = [...draftOptions];
                        updated[i] = e.target.value;
                        setDraftOptions(updated);
                      }}
                      className="flex-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                    />
                    <button
                      onClick={() => setDraftOptions(draftOptions.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 mt-2 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setDraftOptions([...draftOptions, ""])}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium mt-1"
                >
                  + Add option
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 font-medium">Follow-up Context</label>
            <textarea
              value={draft.follow_up_context ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, follow_up_context: e.target.value })
              }
              rows={5}
              className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">
              Tags <span className="text-gray-400 font-normal">(Enter or comma to add · click × to remove)</span>
            </label>
            <TagInput
              value={draftTags}
              onChange={(tags) => { setDraftTags(tags); onNewTags(tags); }}
              suggestions={allTags}
              placeholder="tummy-time, laughing…"
            />
          </div>
          <button
            onClick={save}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
          >
            Save
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.question}</p>
          {(() => {
            const opts: string[] = JSON.parse(q.options_json || "[]");
            return opts.length > 0 ? (
              <ul className="space-y-1 pl-1">
                {opts.map((opt, i) => (
                  <li key={i} className="text-xs text-gray-600">{opt}</li>
                ))}
              </ul>
            ) : null;
          })()}
          <p className="text-xs text-green-700 font-medium">✓ {q.answer}</p>
          {q.follow_up_context && (
            <p className="text-xs text-gray-400 line-clamp-2">{q.follow_up_context}</p>
          )}
          {q.tags && (
            <div className="flex flex-wrap gap-1 pt-1">
              {q.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                <span key={t} className="text-xs bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full border border-brand-100">
                  {t}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function QuestionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<"all" | "milestone_trivia" | "raising_adelina">("all");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [newQ, setNewQ] = useState({
    category: "raising_adelina",
    question: "",
    answer: "",
    answer_type: "multiple_choice",
    follow_up_context: "",
    tags: [] as string[],
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/admin/login");
  }, [status, router]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/questions");
    if (res.ok) {
      const { questions } = await res.json();
      setQuestions(questions);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated") {
      load();
      fetch("/api/admin/tags").then((r) => r.json()).then((d) => setAllTags(d.tags ?? []));
    }
  }, [status]);

  async function handleSave(id: number, updates: Partial<Question> & { tags?: string }) {
    const res = await fetch(`/api/admin/questions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Save failed (${res.status}): ${body.error ?? "unknown error"}`);
      return;
    }
    // Diagnostic: confirm what was actually saved in DB
    if (body.saved?.options_json !== undefined && updates.options_json !== undefined) {
      if (body.saved.options_json !== updates.options_json) {
        alert(`Warning: sent options_json but DB has different value.\nSent: ${updates.options_json}\nDB: ${body.saved.options_json}`);
      }
    }
    load();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    load();
  }

  async function handleAdd() {
    if (!newQ.question || !newQ.answer) return;
    await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newQ, tags: newQ.tags.join(", ") }),
    });
    setAdding(false);
    setNewQ({ category: "raising_adelina", question: "", answer: "", answer_type: "multiple_choice", follow_up_context: "", tags: [] });
    load();
  }

  const filtered = questions.filter(
    (q) => filter === "all" || q.category === filter
  );

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
          <h1 className="text-2xl font-bold text-brand-700">Question Bank</h1>
          <span className="text-sm text-gray-400 ml-auto">
            {questions.length} questions
          </span>
        </div>

        {/* Filter + Add */}
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "milestone_trivia", "raising_adelina"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === c
                  ? "bg-brand-600 text-white"
                  : "bg-white text-gray-500 hover:bg-brand-50"
              }`}
            >
              {c === "all" ? "All" : CATEGORY_LABELS[c]}
            </button>
          ))}
          <button
            onClick={() => setAdding(true)}
            className="ml-auto bg-brand-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-brand-700"
          >
            + Add Question
          </button>
        </div>

        {/* Add form */}
        {adding && (
          <div className="bg-white rounded-2xl shadow p-5 space-y-3 border-l-4 border-brand-300">
            <h2 className="font-semibold text-brand-700">New Question</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 font-medium">Category</label>
                <select
                  value={newQ.category}
                  onChange={(e) => setNewQ({ ...newQ, category: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2 text-sm"
                >
                  <option value="raising_adelina">Raising Adelina</option>
                  <option value="milestone_trivia">Milestone Trivia</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Type</label>
                <select
                  value={newQ.answer_type}
                  onChange={(e) => setNewQ({ ...newQ, answer_type: e.target.value })}
                  className="w-full mt-1 border rounded-lg p-2 text-sm"
                >
                  <option value="multiple_choice">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="select_all">Select All</option>
                  <option value="free_form">Free Form</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Question</label>
              <textarea
                value={newQ.question}
                onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
                rows={3}
                className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="Enter the question…"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Correct Answer</label>
              <input
                value={newQ.answer}
                onChange={(e) => setNewQ({ ...newQ, answer: e.target.value })}
                className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="Enter the correct answer…"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Follow-up Context (optional)</label>
              <textarea
                value={newQ.follow_up_context}
                onChange={(e) => setNewQ({ ...newQ, follow_up_context: e.target.value })}
                rows={3}
                className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="Explanation shown after the player answers…"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">
                Tags <span className="text-gray-400 font-normal">(Enter or comma to add)</span>
              </label>
              <TagInput
                value={newQ.tags}
                onChange={(tags) => { setNewQ({ ...newQ, tags }); setAllTags((prev) => [...new Set([...prev, ...tags])]); }}
                suggestions={allTags}
                placeholder="tummy-time, laughing…"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
              >
                Save
              </button>
              <button
                onClick={() => setAdding(false)}
                className="text-sm text-gray-400 hover:text-gray-600 px-4 py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Question list */}
        {loading ? (
          <p className="text-center text-gray-400 py-12">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">
            No questions yet.{" "}
            {questions.length === 0 && (
              <span>
                Run{" "}
                <code className="bg-gray-100 px-1 rounded">
                  npx tsx scripts/import-questions.ts
                </code>{" "}
                to import seed questions.
              </span>
            )}
          </p>
        ) : (
          <div className="space-y-4">
            {filtered.map((q) => (
              <QuestionCard
                key={q.id}
                q={q}
                onSave={handleSave}
                onDelete={handleDelete}
                allTags={allTags}
                onNewTags={(tags) => setAllTags((prev) => [...new Set([...prev, ...tags])])}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
