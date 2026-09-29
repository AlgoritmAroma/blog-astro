import "server-only";
import { connection } from "next/server";
import { query, toNumber } from "@/lib/db";

export type CategoryRow = { id: number; name: string; sort_order: number };

/** Rubrics, seeded rubrics first (sort_order 1–8), then editor-created ones
 * alphabetically. */
export async function getCategories(): Promise<CategoryRow[]> {
  await connection();
  return query<CategoryRow>(
    `SELECT id, name, sort_order FROM categories ORDER BY sort_order ASC, name ASC`
  );
}

export const CATEGORY_NAME_MAX = 60;

/** Trimmed, inner whitespace collapsed, capped — the one stored form of a
 * rubric name, whichever form it is typed into. Empty means unusable. */
export function normalizeCategoryName(rawName: string): string {
  return rawName.trim().replace(/\s+/g, " ").slice(0, CATEGORY_NAME_MAX);
}

/**
 * Resolves a rubric name to its canonical stored form, creating the row if
 * this is a brand-new rubric. Returns null if the name is unusable.
 *
 * Matching is case-insensitive so "Знаки зодиака" typed a second time as
 * "знаки зодиака" doesn't silently fork the sidebar into two rubrics.
 */
export async function ensureCategory(rawName: string): Promise<string | null> {
  const name = normalizeCategoryName(rawName);
  if (!name) return null;

  const existing = await query<{ name: string }>(
    `SELECT name FROM categories WHERE lower(name) = lower($1) LIMIT 1`,
    [name]
  );
  if (existing[0]) return existing[0].name;

  // ON CONFLICT covers the exact-name race between two concurrent saves; the
  // follow-up SELECT covers the case where that conflict fired.
  const inserted = await query<{ name: string }>(
    `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING name`,
    [name]
  );
  if (inserted[0]) return inserted[0].name;

  const raced = await query<{ name: string }>(
    `SELECT name FROM categories WHERE lower(name) = lower($1) LIMIT 1`,
    [name]
  );
  return raced[0]?.name ?? null;
}

export type CategoryWithUsage = CategoryRow & {
  /** Articles filed under this rubric. */
  postCount: number;
  /** Of those, articles for which it is the only rubric — they are left with
   * none if it is deleted. */
  soleCount: number;
};

/** Every rubric with how many articles use it, for the rubrics page. */
export async function getCategoriesWithUsage(): Promise<CategoryWithUsage[]> {
  await connection();
  const rows = await query<CategoryRow & { post_count: string; sole_count: string }>(
    `SELECT c.id, c.name, c.sort_order,
            COUNT(p.id) AS post_count,
            COUNT(p.id) FILTER (WHERE cardinality(p.categories) = 1) AS sole_count
     FROM categories c
     LEFT JOIN posts p ON c.name = ANY(p.categories)
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.name ASC`
  );
  return rows.map(({ post_count, sole_count, ...row }) => ({
    ...row,
    postCount: toNumber(post_count),
    soleCount: toNumber(sole_count),
  }));
}

export type CategoryUpdateResult =
  | { ok: true; name: string; postCount: number }
  | { ok: false; error: "not-found" | "duplicate"; conflict?: string };

/**
 * Renames a rubric and/or moves it in the sidebar order.
 *
 * Articles point at rubrics by *name* (`posts.categories TEXT[]`, plus the
 * legacy single `posts.category` column holding the first of them), not by
 * id — so a rename has to rewrite those names too, or every article would
 * silently drop out of the renamed rubric and the next boot's backfill in
 * `initSchema` would resurrect the old name as a fresh row. It is one
 * statement, so the rubric and its articles change together or not at all.
 */
export async function updateCategory(
  id: number,
  name: string,
  sortOrder: number
): Promise<CategoryUpdateResult> {
  // Same case-insensitive rule as `ensureCategory`: "Таро" and "таро" are one
  // rubric, so renaming into another rubric's name (in any case) is refused
  // rather than merging the two behind the editor's back. A case-only change
  // of this rubric's own name is fine.
  const clash = await query<{ name: string }>(
    `SELECT name FROM categories WHERE lower(name) = lower($1) AND id <> $2 LIMIT 1`,
    [name, id]
  );
  if (clash[0]) return { ok: false, error: "duplicate", conflict: clash[0].name };

  let rows: { name: string; post_count: string }[];
  try {
    rows = await query<{ name: string; post_count: string }>(
      `WITH old AS (
         SELECT name FROM categories WHERE id = $1
       ),
       cat AS (
         UPDATE categories SET name = $2, sort_order = $3 WHERE id = $1 RETURNING name
       ),
       moved AS (
         UPDATE posts p
         SET categories = CASE
               -- already listed under the new name too: just drop the old one
               WHEN $2 = ANY(p.categories) THEN array_remove(p.categories, old.name)
               ELSE array_replace(p.categories, old.name, $2)
             END,
             category = CASE WHEN p.category = old.name THEN $2 ELSE p.category END
         FROM old
         WHERE old.name <> $2
           AND (old.name = ANY(p.categories) OR p.category = old.name)
         RETURNING p.id
       )
       SELECT cat.name, (SELECT COUNT(*) FROM moved) AS post_count FROM cat`,
      [id, name, sortOrder]
    );
  } catch (err) {
    // A concurrent save created the same name between the check and here.
    if (isUniqueViolation(err)) return { ok: false, error: "duplicate", conflict: name };
    throw err;
  }
  if (!rows[0]) return { ok: false, error: "not-found" };
  return { ok: true, name: rows[0].name, postCount: toNumber(rows[0].post_count) };
}

/**
 * Deletes a rubric and unfiles every article from it. Articles themselves are
 * never deleted: each one just loses this name from its rubric list. One that
 * had no other rubric stays published with none (the blog shows it under
 * «Все»), and its editor is asked to pick a rubric the next time it is saved.
 *
 * The legacy `posts.category` column is rewritten to the new first rubric (or
 * '') as well — `initSchema` rebuilds an empty list from that column and
 * re-inserts every name it finds, so leaving it would bring the deleted
 * rubric back on the next container start.
 */
export async function deleteCategory(id: number): Promise<{ name: string; postCount: number } | null> {
  const rows = await query<{ name: string | null; post_count: string }>(
    `WITH del AS (
       DELETE FROM categories WHERE id = $1 RETURNING name
     ),
     unfiled AS (
       UPDATE posts p
       SET categories = array_remove(p.categories, del.name),
           category = COALESCE((array_remove(p.categories, del.name))[1], '')
       FROM del
       WHERE del.name = ANY(p.categories) OR p.category = del.name
       RETURNING p.id
     )
     SELECT (SELECT name FROM del) AS name, (SELECT COUNT(*) FROM unfiled) AS post_count`,
    [id]
  );
  const row = rows[0];
  if (!row?.name) return null;
  return { name: row.name, postCount: toNumber(row.post_count) };
}

function isUniqueViolation(err: unknown): boolean {
  // Postgres SQLSTATE 23505 = unique_violation.
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}
