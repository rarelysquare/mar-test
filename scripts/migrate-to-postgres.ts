/**
 * One-time migration: copies trivia questions from the local SQLite DB into Postgres.
 * Run after Cloud SQL is provisioned:
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate-to-postgres.ts
 */

import Database from "better-sqlite3";
import { Pool } from "pg";
import path from "path";

const sqlitePath = path.resolve("./data/adelina.db");
const sqlite = new Database(sqlitePath);
const pg = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const questions = sqlite
    .prepare("SELECT * FROM trivia_questions ORDER BY id")
    .all() as {
    id: number;
    category: string;
    question: string;
    answer: string;
    answer_type: string;
    options_json: string;
    follow_up_context: string | null;
    is_adelina_specific: number;
    active: number;
    tags: string;
  }[];

  console.log(`Migrating ${questions.length} questions...`);

  for (const q of questions) {
    await pg.query(
      `INSERT INTO trivia_questions
         (category, question, answer, answer_type, options_json, follow_up_context, is_adelina_specific, active, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING`,
      [
        q.category,
        q.question,
        q.answer,
        q.answer_type,
        q.options_json,
        q.follow_up_context,
        q.is_adelina_specific,
        q.active,
        q.tags,
      ]
    );
  }

  console.log("Done.");
  await pg.end();
  sqlite.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
