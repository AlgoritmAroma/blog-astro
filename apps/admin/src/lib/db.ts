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

/** The 8 rubrics the blog used to ship with. Nothing seeds them any more —
 * the editor creates rubrics as articles need them — but they're still listed
 * here so the one-time cleanup below knows exactly which rows were ours to
 * remove, and never touches a rubric the editor typed themselves. */
const RETIRED_SEED_CATEGORIES = [
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
        views INTEGER NOT NULL DEFAULT 0,
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

      -- Marks one-off data migrations as done. Both apps run initSchema()
      -- against the same database, so a migration that must happen exactly
      -- once needs a row here rather than an IF NOT EXISTS guard.
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Structured article body from the block editor. NULL on posts written
      -- before it existed — those keep rendering from the markdown in
      -- posts.content, which stays the plain-text mirror either way.
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS blocks JSONB;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS bg_color TEXT;
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_alt TEXT;

      -- SEO <title>, kept apart from the on-page H1: the H1 is written for a
      -- reader mid-page, the meta title for a search result. NULL/empty means
      -- "no separate one" and the blog falls back to the H1.
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS meta_title TEXT;

      -- Editor's override for the reading estimate, in whole minutes. NULL
      -- means "work it out from the text", which is what every article did
      -- before this column existed.
      ALTER TABLE posts ADD COLUMN IF NOT EXISTS reading_time INTEGER;

      -- Was 1000: a new article opened with a thousand views nobody had made.
      -- The counter is the real number now, so it starts where the truth does.
      ALTER TABLE posts ALTER COLUMN views SET DEFAULT 0;
      `
  );

  // Any rubric an existing post already uses becomes a real row, so the
  // sidebar can't lose a category that has articles in it.
  await pool.query(
    `INSERT INTO categories (name)
     SELECT DISTINCT category FROM posts WHERE category <> ''
     ON CONFLICT (name) DO NOTHING`
  );

  await dropRetiredSeedCategories();
  await resetViewCounts();
}

/** Runs a one-off data migration exactly once across both apps, and tells the
 * caller whether this process is the one that got to run it. */
async function claimMigration(name: string): Promise<boolean> {
  const claimed = await pool.query(
    `INSERT INTO schema_migrations (name) VALUES ($1)
     ON CONFLICT (name) DO NOTHING
     RETURNING name`,
    [name]
  );
  // rows, not rowCount — pg types the latter as nullable, and a null would
  // read as "not yet applied" and re-run the migration on every boot.
  return claimed.rows.length > 0;
}

/**
 * Rubrics are the editor's to create, one per article that needs one — so the
 * 8 we used to seed are removed. Only once, and only the ones no article
 * stands in: an editor who deliberately recreates "Совместимость" must not
 * find it deleted again on the next container restart.
 */
async function dropRetiredSeedCategories(): Promise<void> {
  if (!(await claimMigration("drop-seeded-categories"))) return;

  await pool.query(
    `DELETE FROM categories c
     WHERE c.name = ANY($1::text[])
       AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.category = c.name)`,
    [RETIRED_SEED_CATEGORIES]
  );
}

/**
 * Every article carried a made-up head start of 1000-plus views, topped up by
 * hand from the admin. The counter is presented as a real one, so it has to
 * start from zero — a number nobody invented — and grow only from actual
 * reads. Once, obviously: a restart must not wipe what has been counted since.
 */
async function resetViewCounts(): Promise<void> {
  if (!(await claimMigration("reset-view-counts"))) return;

  await pool.query(`UPDATE posts SET views = 0`);
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
