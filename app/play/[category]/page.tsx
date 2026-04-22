"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { CATEGORY_SLUGS, CATEGORY_NAMES } from "@/lib/game";
import { StarIcon, ClapIcon, MuscleIcon } from "@/app/components/SoftIcons";
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

type Phase = "loading" | "question" | "reviewing" | "completion" | "exhausted";

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
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"video" | "photo" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [smsOptedIn, setSmsOptedIn] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsError, setSmsError] = useState("");

  const slug = typeof window !== "undefined" ? localStorage.getItem("playerSlug") : null;

  useEffect(() => {
    setSmsOptedIn(localStorage.getItem("smsOptedIn") === "1");
  }, []);

  const loadQuestions = useCallback(async () => {
    if (!slug || !category) { router.replace("/"); return; }

    const res = await fetch(`/api/game/questions?slug=${slug}&category=${categorySlug}`);
    const data = await res.json();

    if (!data.questions?.length) {
      if (data.exhausted) {
        setPhase("exhausted");
      } else {
        router.replace("/play");
      }
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
    if (data.media_url) setMediaUrl(data.media_url);
    if (data.media_type) setMediaType(data.media_type);
    setPhase("reviewing");
    setSubmitting(false);
  }

  function handleContinue() {
    if (currentIndex + 1 >= questions.length || result?.questions_remaining === 0) {
      setPhase("completion");
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

  // ── Loading ──────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex items-center justify-center">
        <p className="text-brand-400">Loading…</p>
      </main>
    );
  }

  // ── Exhausted ────────────────────────────────────────────────────────────
  if (phase === "exhausted") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <p className="text-5xl">🌱</p>
          <h1 className="text-2xl font-bold text-brand-700">You&apos;ve seen them all!</h1>
          <p className="text-brand-400 text-sm">
            You&apos;ve answered every question in the game. Check back later — more are on the way!
          </p>
          <button
            onClick={() => router.push("/play")}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-2xl text-base transition"
          >
            Back to home
          </button>
        </div>
      </main>
    );
  }

  // ── Completion ───────────────────────────────────────────────────────────
  if (phase === "completion") {
    const correct = result?.correct ?? false;
    const EmojiIcon = correct ? StarIcon : ClapIcon;
    const night = isNightTime();

    async function handleSmsOptIn(e: React.FormEvent) {
      e.preventDefault();
      if (!slug) return;
      setSmsSaving(true);
      setSmsError("");
      const res = await fetch("/api/game/sms-optin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, phone: phoneInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSmsError(data.error ?? "Something went wrong");
      } else {
        localStorage.setItem("smsOptedIn", "1");
        setSmsOptedIn(true);
      }
      setSmsSaving(false);
    }

    async function handleSmsOptOut() {
      if (!slug) return;
      await fetch("/api/game/sms-optin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      localStorage.removeItem("smsOptedIn");
      setSmsOptedIn(false);
    }

    return (
      <main className="min-h-screen bg-gradient-to-b from-cream-100 to-brand-50 flex flex-col">
        <div className="max-w-sm mx-auto px-4 pt-10 pb-8 w-full space-y-6 text-center">

          {night ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/illustrations/adelina-${getNightIllustration()}.png`}
              alt="Adelina"
              className="w-40 h-40 mx-auto object-contain"
            />
          ) : (
            <EmojiIcon className="w-16 h-16 mx-auto" />
          )}

          <h1 className="text-2xl font-bold text-brand-700">
            {correct ? "You got it!" : "Nice try!"}
          </h1>

          {/* SMS opt-in (shown prominently before opted in) */}
          {!smsOptedIn && (
            <div className="bg-brand-500 rounded-3xl p-6 text-left space-y-3">
              <p className="text-white font-bold text-lg leading-snug">Get a daily reminder to play</p>
              <p className="text-brand-100 text-sm">We&apos;ll text you each day when a new question is ready.</p>
              <form onSubmit={handleSmsOptIn} className="space-y-2">
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full bg-white/20 text-white placeholder-brand-200 border border-white/30 rounded-xl px-4 py-3 text-base focus:outline-none focus:bg-white/30"
                />
                {smsError && <p className="text-red-200 text-xs">{smsError}</p>}
                <button
                  type="submit"
                  disabled={smsSaving || !phoneInput.trim()}
                  className="w-full bg-white text-brand-600 font-bold py-3 rounded-xl text-base transition disabled:opacity-50 hover:bg-brand-50"
                >
                  {smsSaving ? "Signing up…" : "Yes, remind me daily"}
                </button>
                <button
                  type="button"
                  onClick={() => { localStorage.setItem("smsOptedIn", "skip"); setSmsOptedIn(true); }}
                  className="w-full text-brand-200 text-sm py-1"
                >
                  No thanks
                </button>
              </form>
            </div>
          )}

          {/* Media */}
          {mediaUrl ? (
            <div className="space-y-3 text-left">
              <p className="text-center font-semibold text-brand-600">
                🎀 {mediaType === "photo" ? "Today's memory" : "Today's video"}
              </p>
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
                href={`/api/download?url=${encodeURIComponent(mediaUrl)}`}
                download
                className={`flex items-center justify-center gap-2 w-full text-sm font-semibold text-center py-3 rounded-xl transition ${
                  smsOptedIn
                    ? "bg-brand-500 hover:bg-brand-600 text-white"
                    : "bg-cream-50 border border-brand-200 text-brand-600 hover:bg-brand-50"
                }`}
              >
                ⬇ {mediaType === "photo" ? "Download photo" : "Download video"}
              </a>
            </div>
          ) : (
            <p className="text-brand-400 text-sm">Come back tomorrow for your next question.</p>
          )}

          <button
            onClick={() => router.push("/play")}
            className="w-full bg-cream-50 border border-brand-200 text-brand-600 font-semibold py-4 rounded-2xl text-base transition hover:bg-brand-50"
          >
            Back to home
          </button>

          {/* Unsubscribe (only shown after opted in via phone, not "skip") */}
          {smsOptedIn && localStorage.getItem("smsOptedIn") === "1" && (
            <button
              onClick={handleSmsOptOut}
              className="text-xs text-brand-300 hover:text-brand-500"
            >
              Unsubscribe from daily reminders
            </button>
          )}

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
          <p className="text-xs text-brand-400 font-medium uppercase tracking-wide flex-1">
            {category === "daily" ? "Today's Question" : CATEGORY_NAMES[category]}
          </p>
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
                  style = "w-full text-left bg-brand-100 border-2 border-brand-400 rounded-2xl px-5 py-4 text-sm font-medium text-brand-800 transition";
                } else if (isSelected && !result.correct) {
                  style = "w-full text-left bg-blush-100 border-2 border-blush-400/50 rounded-2xl px-5 py-4 text-sm font-medium text-blush-400 transition";
                } else {
                  style = "w-full text-left bg-cream-50 border-2 border-brand-100 rounded-2xl px-5 py-4 text-sm font-medium text-brand-300 transition";
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

        {/* Follow-up + Continue */}
        {phase === "reviewing" && result && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-4 ${
              result.correct ? "bg-brand-100 border border-brand-300" : "bg-blush-100 border border-blush-400/40"
            }`}>
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
              onClick={handleContinue}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-4 rounded-2xl text-base transition shadow-sm"
            >
              {mediaUrl ? "See today's reward →" : "Continue →"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
