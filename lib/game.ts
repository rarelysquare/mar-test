export const CATEGORY_SLUGS: Record<string, string> = {
  "milestone-trivia": "milestone_trivia",
  "raising-adelina": "raising_adelina",
  "daily": "daily",
};

export const CATEGORY_NAMES: Record<string, string> = {
  milestone_trivia: "Milestone Trivia",
  raising_adelina: "Raising Adelina",
  daily: "Daily Questions",
};

export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  milestone_trivia: "How well do you know baby milestones?",
  raising_adelina: "The science of loving a baby well.",
  daily: "A mix of questions about Adelina.",
};

export const CATEGORY_EMOJIS: Record<string, string> = {
  milestone_trivia: "🌱",
  raising_adelina: "💛",
  daily: "👶",
};

export const MAX_DAILY_QUESTIONS = 1;

export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function todayDate(tz?: string): string {
  const timezone = tz || "UTC";
  const now = new Date();
  try {
    // Get current hour in the target timezone
    const hourStr = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now);
    const hour = parseInt(hourStr, 10);

    // Before 6am local time → still "yesterday's" game day
    const effective = hour < 6 ? new Date(now.getTime() - 86400000) : now;

    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(effective);
  } catch {
    // Unrecognised timezone — fall back to UTC date
    return now.toISOString().split("T")[0];
  }
}

export function yesterdayDate(tz?: string): string {
  const timezone = tz || "UTC";
  const oneDayAgo = new Date(Date.now() - 86400000);
  try {
    const hourStr = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(oneDayAgo);
    const hour = parseInt(hourStr, 10);
    const effective = hour < 6 ? new Date(oneDayAgo.getTime() - 86400000) : oneDayAgo;
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(effective);
  } catch {
    return oneDayAgo.toISOString().split("T")[0];
  }
}

export function getDayNumber(): number {
  return Math.floor(Date.now() / 86400000);
}

export type AnswerRecord = {
  question_id: number;
  category: string;
  selected: string;
  correct: boolean;
};

export function pickVideoByTags<T extends { filename: string; tags: string }>(
  videos: T[],
  questionTagSet: Set<string>
): T | undefined {
  if (!videos.length) return undefined;

  if (questionTagSet.size > 0) {
    const scored = videos
      .map((v) => {
        const videoTags = v.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
        const matches = videoTags.filter((t) => questionTagSet.has(t)).length;
        return { video: v, matches };
      })
      .filter((s) => s.matches > 0)
      .sort((a, b) => b.matches - a.matches);

    if (scored.length > 0) {
      const topScore = scored[0].matches;
      const topVideos = scored.filter((s) => s.matches === topScore);
      return topVideos[Math.floor(Math.random() * topVideos.length)].video;
    }
  }

  // Fall back to random
  return videos[Math.floor(Math.random() * videos.length)];
}

export function checkAnswer(
  answerType: string,
  correctAnswer: string,
  selectedOption: string
): boolean {
  if (answerType === "free_form" || answerType === "select_all") return true;

  // Match by letter prefix: "B) ..." → "B"
  const correctLetter = correctAnswer.match(/^([A-E])\)/i)?.[1]?.toUpperCase();
  const selectedLetter = selectedOption.match(/^([A-E])\)/i)?.[1]?.toUpperCase();
  if (correctLetter && selectedLetter) return correctLetter === selectedLetter;

  // True/False: answer may have explanation ("False — because...")
  const cNorm = correctAnswer.toLowerCase().trim();
  const sNorm = selectedOption.toLowerCase().trim();
  return cNorm.startsWith(sNorm) || sNorm === cNorm;
}
