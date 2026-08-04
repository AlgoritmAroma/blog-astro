import "server-only";
import { connection } from "next/server";
import { query } from "@/lib/db";

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

/**
 * Resolves a rubric name to its canonical stored form, creating the row if
 * this is a brand-new rubric. Returns null if the name is unusable.
 *
 * Matching is case-insensitive so "Знаки зодиака" typed a second time as
 * "знаки зодиака" doesn't silently fork the sidebar into two rubrics.
 */
export async function ensureCategory(rawName: string): Promise<string | null> {
  const name = rawName.trim().replace(/\s+/g, " ").slice(0, CATEGORY_NAME_MAX);
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

/** Rubrics that no article uses — safe to offer for deletion in the admin. */
export async function deleteCategoryIfUnused(id: number): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `DELETE FROM categories c
     WHERE c.id = $1
       AND NOT EXISTS (SELECT 1 FROM posts p WHERE p.category = c.name)
     RETURNING c.id`,
    [id]
  );
  return rows.length > 0;
}
