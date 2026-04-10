import { Pool } from "pg";
import { SCHEMA } from "./schema";

let _ready: Promise<Pool> | null = null;

async function init(): Promise<Pool> {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });
  await pool.query(SCHEMA);
  const migrations = [
    "ALTER TABLE trivia_questions ADD COLUMN IF NOT EXISTS is_adelina_specific INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE trivia_questions ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS tags TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE media_items ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''",
  ];
  for (const sql of migrations) {
    await pool.query(sql);
  }
  return pool;
}

export function getDb(): Promise<Pool> {
  if (!_ready) _ready = init();
  return _ready;
}
