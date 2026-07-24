// NOTE: deliberately no `import "server-only"` here — this module is also
// imported directly by scripts/seed.ts, which runs via plain `tsx` outside
// Next's bundler (where the server-only stub always throws, since the
// bundler aliasing that makes it a no-op on the server never runs). The
// safety net against accidental client-component imports lives one layer up,
// in lib/posts.ts, which is the module actual app code imports.
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";

// Guardrail: every query against `db` below must be parameterized
// (`db.prepare("... WHERE slug = ?").get(slug)`) — never string-interpolate
// user input into SQL.

const DATABASE_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "blog.db");

declare global {
  // eslint-disable-next-line no-var
  var __blogDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

  const database = new Database(DATABASE_PATH);
  database.pragma("journal_mode = WAL");

  database.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT NOT NULL,
      cover TEXT NOT NULL,
      published_at TEXT NOT NULL,
      views INTEGER NOT NULL DEFAULT 1000,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return database;
}

// Cached on globalThis so dev-mode HMR module re-evaluation doesn't open a
// new sqlite connection (and file lock) on every edit.
export const db = globalThis.__blogDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalThis.__blogDb = db;
}
