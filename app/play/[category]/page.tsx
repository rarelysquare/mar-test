"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { CATEGORY_SLUGS, CATEGORY_NAMES } from "@/lib/game";
import { StarIcon, ClapIcon, MuscleIcon, PartyIcon, MoonIcon } from "@/app/components/SoftIcons";
import { DevReset } from "@/app/components/DevReset";

const NIGHT_ILLUSTRATIONS = ["sleeping-back", "sleeping-side", "sleeping-tummy"];
function getNightIllustration() {
  const day = Math.floor(Date.now() / 86400000);
  return NIGHT_ILLUSTRATIONS[day % NIGHT_ILLUSTRATIONS.length];
}
function isNightTime() {
  return new Date().getHours() >= 19;
}

interface Question {
  id: number;
  question: string;
  answer_type: string;
  options: string[];
  answer: string;
  follow_up_context: string | null;
}

interface AnswerResult {
  correct: boolean;
  correct_answer: string;
  follow_up_context: string | null;
  questions_remaining: number;
  media_url: string | null;
  media_type: "video" | "photo" | null;
}

type Phase = "loading" | "question" | "reviewing" | "results" | "media";

export default function CategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categorySlug = params.category as string;
  const category = CATEGORY_SLUGS[categorySlug];

  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedMultiple, setSelectedMultiple] = useState<string[]>([]);
  const [freeFormText, setFreeFormText] = useState("");
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [sessionResults, setSessionResults] = useState<{ correct: boolean }[]>([]);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"video" | "photo" | null>(null);
  const [submitting, setSubmitting] = useState(false);


  const slug = typeof window !== "undefined" ? localStorage.getItem("playerSlug") : null;

  const loadQuestions = useCallback(async () => {
    if (!slug || !category) { router.replace("/"); return; }

    const res = await fetch(`/api/game/questions?slug=${slug}&category=${categorySlug}`);
    const data = await res.json();

    if (!data.questions?.length) {
      // No questions available — go back to category select
      router.replace("/play");
      return;
    }

    setQuestions(data.questions);
    setPhase("question");
  }, [slug, category, categorySlug, router]);

  useEffect(() => {
    if (!slug) { router.replace("/"); return; }
    if (!category) { router.replace("/play"); return; }
    loadQuestions();
  }, [loadQuestions, slug, category, router]);

  async function handleSelect(option: string) {
    if (submitting || phase !== "question") return;
    setSelected(option);
    setSubmitting(true);

    const res = await fetch("/api/game/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        question_id: questions[currentIndex].id,
        selected_option: option,
      }),
    });

    const data: AnswerResult = await res.json();
    setResult(data);
    setSessionResults((prev) => [...prev, { correct: data.correct }]);
    if (data.media_url) setMediaUrl(data.media_url);
    if (data.media_type) setMediaType(data.media_type);
    setPhase("reviewing");
    setSubmitting(false);
  }

  async function handleNext() {
    if (currentIndex + 1 >= questions.length || result?.questions_remaining === 0) {
      // Go directly to media if available, otherwise results
      setPhase(mediaUrl ? "media" : "results");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
      setSelectedMultiple([]);
      setFreeFormText("");
      setResult(null);
      setPhase("question");
    }
  }

  const q = questions[currentIndex];
  const correctCount = sessionResults.filter((r) => r.correct).length;

  // ── Loading ──────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex items-center justify-center">
        <p className="text-brand-400">Loading questions…</p>
      </main>
    );
  }

  // ── Results ──────────────────────────────────────────────────────────────
  if (phase === "results") {
    const pct = sessionResults.length > 0 ? correctCount / sessionResults.length : 0;
    const EmojiIcon = pct === 1 ? StarIcon : pct >= 0.6 ? ClapIcon : MuscleIcon;
    const message =
      pct === 1
        ? "Perfect score!"
        : pct >= 0.6
        ? "Great job!"
        : "Keep it up!";
    const night = isNightTime();

    return (
      <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex flex-col">
        <div className="max-w-sm mx-auto px-4 pt-10 pb-8 w-full space-y-6 text-center">
          {night ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/illustrations/adelina-${getNightIllustration()}.png`}
              alt="Adelina sleeping"
              className="w-40 h-40 mx-auto object-contain"
            />
          ) : (
            <EmojiIcon className="w-16 h-16 mx-auto" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-brand-700">{message}</h1>
          </div>

          {mediaUrl && (
            <button
              onClick={() => setPhase("media")}
              className="w-full bg-blush-400 hover:bg-blush-400/80 text-white font-semibold py-4 rounded-2xl text-base transition shadow-sm"
            >
              <PartyIcon className="w-5 h-5 inline-block mr-1 align-middle" />
              {mediaType === "photo" ? "See today's memory" : "Watch today's video"}
            </button>
          )}

          {result && result.questions_remaining > 0 ? (
            <button
              onClick={() => router.push("/play")}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-2xl text-base transition shadow-sm"
            >
              Play again
            </button>
          ) : (
            <p className="text-brand-400 text-sm text-center py-2">
              All done for today! Come back tomorrow. <MoonIcon className="w-4 h-4 inline-block align-middle" />
            </p>
          )}

          <button
            onClick={() => router.push("/play")}
            className="w-full bg-cream-50 border border-brand-200 text-brand-600 font-semibold py-4 rounded-2xl text-base transition hover:bg-brand-50"
          >
            Back to home
          </button>
          <div className="text-center">
            <DevReset />
          </div>
        </div>
      </main>
    );
  }

  // ── Media reward ─────────────────────────────────────────────────────────
  if (phase === "media" && mediaUrl) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-4">
          <div className="text-center space-y-1">
            <p className="text-4xl">🎀</p>
            <h1 className="text-2xl font-bold text-brand-700">
              {mediaType === "photo" ? "Today's memory" : "Today's video"}
            </h1>
          </div>
          {mediaType === "video" ? (
            <video
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              className="w-full rounded-2xl shadow-lg"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt="Today's memory"
              className="w-full rounded-2xl shadow-lg object-contain"
            />
          )}
          <a
            href={mediaUrl}
            download
            className="block w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold text-center py-3 rounded-xl transition"
          >
            ⬇ {mediaType === "photo" ? "Download photo" : "Download video"}
          </a>
          <button
            onClick={() => setPhase("results")}
            className="w-full text-brand-400 hover:text-brand-600 text-sm py-2 transition"
          >
            Back to results
          </button>
          <div className="text-center">
            <DevReset />
          </div>
        </div>
      </main>
    );
  }

  // ── Question + Review ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex flex-col">
      <div className="max-w-sm mx-auto px-4 pt-6 pb-8 w-full flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/play")}
            className="text-brand-400 hover:text-brand-600 text-sm"
          >
            ←
          </button>
          <div className="flex-1">
            <p className="text-xs text-brand-400 font-medium uppercase tracking-wide">
              {category === "daily" ? "Today's Question" : CATEGORY_NAMES[category]}
            </p>
          </div>
        </div>

        {/* Question */}
        <div className="bg-cream-50 rounded-3xl p-6 shadow-sm border border-brand-100">
          <p className="text-base font-medium text-brand-800 leading-relaxed whitespace-pre-wrap">
            {q.question}
          </p>
        </div>

        {/* Options */}
        {q.answer_type === "free_form" ? (
          <div className="space-y-3">
            {phase === "question" ? (
              <>
                <textarea
                  value={freeFormText}
                  onChange={(e) => setFreeFormText(e.target.value)}
                  placeholder="Type your answer…"
                  rows={3}
                  className="w-full bg-cream-50 border-2 border-brand-100 rounded-2xl px-5 py-4 text-sm text-brand-800 focus:outline-none focus:border-brand-300 resize-none placeholder-brand-300"
                />
                <button
                  onClick={() => handleSelect(freeFormText || "(no answer)")}
                  disabled={submitting}
                  className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl text-base transition shadow-sm"
                >
                  {submitting ? "Submitting…" : "Submit"}
                </button>
              </>
            ) : (
              <div className="bg-cream-50 border-2 border-brand-100 rounded-2xl px-5 py-4 text-sm text-brand-400 italic">
                {freeFormText || "(no answer)"}
              </div>
            )}
          </div>
        ) : q.answer_type === "select_all" ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide text-center">
              Select all that apply
            </p>
            {q.options.map((option) => {
              const isChecked = selectedMultiple.includes(option);
              const isReviewing = phase === "reviewing";

              let style = isChecked
                ? "w-full text-left bg-brand-100 border-2 border-brand-400 rounded-2xl px-5 py-4 text-sm font-medium text-brand-800 transition flex items-center gap-3"
                : "w-full text-left bg-cream-50 border-2 border-brand-100 rounded-2xl px-5 py-4 text-sm font-medium text-brand-700 transition flex items-center gap-3";

              if (isReviewing) {
                style = isChecked
                  ? "w-full text-left bg-brand-100 border-2 border-brand-300 rounded-2xl px-5 py-4 text-sm font-medium text-brand-700 transition flex items-center gap-3"
                  : "w-full text-left bg-cream-50 border-2 border-brand-100 rounded-2xl px-5 py-4 text-sm font-medium text-brand-300 transition flex items-center gap-3";
              }

              return (
                <button
                  key={option}
                  onClick={() => {
                    if (isReviewing || submitting) return;
                    setSelectedMultiple((prev) =>
                      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
                    );
                  }}
                  disabled={isReviewing || submitting}
                  className={style}
                >
                  <span className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${isChecked ? "bg-brand-500 border-brand-500" : "border-gray-300"}`}>
                    {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </span>
                  {option}
                </button>
              );
            })}
            {phase === "question" && (
              <button
                onClick={() => handleSelect(selectedMultiple.join(", ") || "(none selected)")}
                disabled={submitting || selectedMultiple.length === 0}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl text-base transition shadow-sm"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {q.options.map((option) => {
              let style =
                "w-full text-left bg-cream-50 border-2 border-brand-100 rounded-2xl px-5 py-4 text-sm font-medium text-brand-700 transition active:scale-95";

              if (phase === "reviewing" && result) {
                const isCorrectOption =
                  option === result.correct_answer ||
                  option.match(/^([A-E])\)/i)?.[1]?.toUpperCase() ===
                    result.correct_answer.match(/^([A-E])\)/i)?.[1]?.toUpperCase();
                const isSelected = option === selected;

                if (isCorrectOption) {
                  style =
                    "w-full text-left bg-brand-100 border-2 border-brand-400 rounded-2xl px-5 py-4 text-sm font-medium text-brand-800 transition";
                } else if (isSelected && !result.correct) {
                  style =
                    "w-full text-left bg-blush-100 border-2 border-blush-400/50 rounded-2xl px-5 py-4 text-sm font-medium text-blush-400 transition";
                } else {
                  style =
                    "w-full text-left bg-cream-50 border-2 border-brand-100 rounded-2xl px-5 py-4 text-sm font-medium text-brand-300 transition";
                }
              }

              return (
                <button
                  key={option}
                  onClick={() => handleSelect(option)}
                  disabled={phase === "reviewing" || submitting}
                  className={style}
                >
                  {option}
                </button>
              );
            })}
          </div>
        )}

        {/* Follow-up + Next */}
        {phase === "reviewing" && result && (
          <div className="space-y-4">
            <div
              className={`rounded-2xl p-4 ${
                result.correct ? "bg-brand-100 border border-brand-300" : "bg-blush-100 border border-blush-400/40"
              }`}
            >
              <p className={`text-sm font-semibold mb-1 ${result.correct ? "text-brand-700" : "text-blush-400"}`}>
                {result.correct ? "✓ Correct!" : "Not quite —"}
              </p>
              {!result.correct && (
                <p className="text-sm text-brand-600 mb-2">
                  The answer is: <span className="font-medium">{result.correct_answer}</span>
                </p>
              )}
              {result.follow_up_context && (
                <p className="text-sm text-brand-600 leading-relaxed whitespace-pre-wrap">
                  {result.follow_up_context}
                </p>
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-2xl text-base transition shadow-sm"
            >
              {currentIndex + 1 >= questions.length || result.questions_remaining === 0
                ? "See results"
                : "Next question →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
