import "server-only";
import { connection } from "next/server";
import { query } from "@/lib/db";

/** Rubric names for the sidebar, seeded ones first then editor-created ones
 * alphabetically. Read-only here — rubrics are managed from the admin. */
export async function getCategoryNames(): Promise<string[]> {
  await connection();
  const rows = await query<{ name: string }>(
    `SELECT name FROM categories ORDER BY sort_order ASC, name ASC`
  );
  return rows.map((row) => row.name);
}
