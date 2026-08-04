// NOTE: deliberately no `import "server-only"` here — this module is also
// imported directly by scripts/seed.ts, which runs via plain `tsx` outside
// Next's bundler (where the server-only stub always throws, since the
// bundler aliasing that makes it a no-op on the server never runs). The
// safety net against accidental client-component imports lives one layer up,
// in lib/posts.ts, which is the module actual app code imports.
import { Pool, type QueryResultRow } from "pg";

// Guardrail: every query must go through `query()` below, parameterized
// (`$1, $2, ...`) — never string-interpolate user input into SQL.

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL env var must be set to a postgres connection string.");
}

declare global {
  // eslint-disable-next-line no-var
  var __blogPool: Pool | undefined;
}

// Cached on globalThis so dev-mode HMR module re-evaluation doesn't open a
// new connection pool on every edit.
export const pool = globalThis.__blogPool ?? new Pool({ connectionString: DATABASE_URL });
if (process.env.NODE_ENV !== "production") {
  globalThis.__blogPool = pool;
}

let schemaReady: Promise<void> | undefined;

/** The 8 rubrics the blog shipped with. They're seeded as ordinary rows now
 * rather than hardcoded in the app, so an editor can add their own — these
 * just guarantee a fresh database isn't empty. */
const DEFAULT_CATEGORIES = [
  "Натальная карта",
  "Совместимость",
  "Астрологические прогнозы",
  "Знаки зодиака",
  "Любовь и отношения",
  "Самопознание",
  "Ведическая астрология",
  "Планеты и их влияние",
];

async function initSchema(): Promise<void> {
  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        cover TEXT NOT NULL,
        published_at TEXT NOT NULL,
        views INTEGER NOT NULL DEFAULT 1000,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 100,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Structured article body from the block editor. NULL on posts written
      -- before it existed — those keep rendering from the markdown in
      -- posts.content, which stays the plain-text mirror either way.
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS blocks JSONB;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS bg_color TEXT;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_alt TEXT;
      `
  );

  await pool.query(
    `INSERT INTO categories (name, sort_order)
     SELECT name, ordinality::int
     FROM unnest($1::text[]) WITH ORDINALITY AS seed(name, ordinality)
     ON CONFLICT (name) DO NOTHING`,
    [DEFAULT_CATEGORIES]
  );

  // Any rubric an existing post already uses becomes a real row too, so the
  // sidebar can't lose a category that has articles in it.
  await pool.query(
    `INSERT INTO categories (name)
     SELECT DISTINCT category FROM posts WHERE category <> ''
     ON CONFLICT (name) DO NOTHING`
  );
}

/** Every query goes through here so the schema-exists check runs at most
 * once per process, lazily, on first real query — pg is async end-to-end so
 * (unlike the old sqlite setup) this can't happen synchronously at module
 * load. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  schemaReady ??= initSchema();
  await schemaReady;
  const result = await pool.query<T>(text, params);
  return result.rows;
}

/** node-postgres returns bigint aggregates (COUNT, etc.) as strings to avoid
 * silent precision loss — callers that know the value fits a JS number use
 * this instead of a raw cast. */
export function toNumber(value: string): number {
  return Number(value);
}
