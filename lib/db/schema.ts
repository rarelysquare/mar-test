export const SCHEMA = `
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  total_points INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date TEXT
);

CREATE TABLE IF NOT EXISTS daily_games (
  id SERIAL PRIMARY KEY,
  game_date TEXT NOT NULL UNIQUE,
  photo_id TEXT NOT NULL,
  photo_timestamp TEXT,
  photo_lat REAL,
  photo_lng REAL,
  questions_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE TABLE IF NOT EXISTS player_sessions (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  game_date TEXT NOT NULL,
  answers_json TEXT NOT NULL DEFAULT '[]',
  score INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  UNIQUE(player_id, game_date)
);

CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  badge_key TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  UNIQUE(player_id, badge_key)
);

CREATE TABLE IF NOT EXISTS weekly_videos (
  id SERIAL PRIMARY KEY,
  week_start TEXT NOT NULL UNIQUE,
  file_path TEXT NOT NULL,
  point_threshold INTEGER NOT NULL DEFAULT 50,
  uploaded_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS trivia_questions (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK(category IN ('milestone_trivia', 'raising_adelina')),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  answer_type TEXT NOT NULL CHECK(answer_type IN ('multiple_choice', 'true_false', 'select_all', 'free_form')),
  options_json TEXT NOT NULL DEFAULT '[]',
  follow_up_context TEXT,
  is_adelina_specific INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  tags TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  updated_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE TABLE IF NOT EXISTS media_items (
  id SERIAL PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('photo', 'video')),
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  tags TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  uploaded_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  used_on TEXT
);

CREATE TABLE IF NOT EXISTS player_media_history (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id),
  media_id INTEGER NOT NULL REFERENCES media_items(id),
  shown_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
  UNIQUE(player_id, media_id)
);
`;
