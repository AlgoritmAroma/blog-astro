import "server-only";
import { connection } from "next/server";
import { query, toNumber } from "@/lib/db";
import type { PostMeta } from "@/lib/blog";
import { markdownToBlocks, parseBlocks, DEFAULT_BACKGROUND, type Block } from "@/lib/blocks";

export type { PostMeta, Post, Comment, Category, CommentStatus } from "@/lib/blog";

type PostRow = {
  id: number;
  slug: string;
  title: string;
  meta_title: string | null;
  excerpt: string;
  content: string;
  category: string;
  cover: string;
  cover_alt: string | null;
  cover_focus_x: number | null;
  cover_focus_y: number | null;
  bg_color: string | null;
  blocks: unknown;
  published_at: string;
  reading_time: number | null;
  views: number;
};

function readingTimeFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

function rowToMeta(row: PostRow): PostMeta {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    metaTitle: row.meta_title ?? "",
    excerpt: row.excerpt,
    date: row.published_at,
    category: row.category,
    cover: row.cover,
    coverAlt: row.cover_alt || row.title,
    // The estimate is only a fallback: once the editor puts a number in the
    // form it wins, and re-editing the body never quietly moves it.
    readingTime: row.reading_time ?? readingTimeFromText(row.content),
    views: row.views,
  };
}

/** Listing for the posts admin screen, newest first. */
export async function getAllPosts(): Promise<PostMeta[]> {
  await connection();
  const rows = await query<PostRow>(`SELECT * FROM posts ORDER BY published_at DESC`);
  return rows.map(rowToMeta);
}

// ---------- admin-only CRUD (called from Server Actions, already
// requireAdmin()-gated at the call site) ----------

export type PostInput = {
  slug: string;
  title: string;
  /** Empty string when the editor left the SEO title blank — stored as NULL. */
  metaTitle: string;
  excerpt: string;
  content: string;
  blocks: Block[];
  category: string;
  cover: string;
  coverAlt: string;
  /** Percent of the cover's own width/height, handed to the blog as CSS
   * `object-position`. Never null on the way in — the form always sends a
   * pair, defaulting to the centre for a cover uploaded before the picker. */
  coverFocus: { x: number; y: number };
  bgColor: string;
  publishedAt: string;
  /** null = estimate it from the text. */
  readingTime: number | null;
};
// No `views` here on purpose: the counter belongs to the readers now, and an
// article save must not overwrite what they've counted.

export async function getPostById(id: number): Promise<(PostInput & { id: number }) | null> {
  const rows = await query<PostRow>(`SELECT * FROM posts WHERE id = $1`, [id]);
  const row = rows[0];
  if (!row) return null;

  // Articles written before the block editor existed have `blocks` NULL and
  // only markdown in `content`. Converting on read means opening one in the
  // constructor shows its real structure instead of a blank canvas — and the
  // markdown is left untouched in the DB until the editor actually saves.
  const blocks = row.blocks === null ? markdownToBlocks(row.content) : parseBlocks(row.blocks);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    metaTitle: row.meta_title ?? "",
    excerpt: row.excerpt,
    content: row.content,
    blocks,
    category: row.category,
    cover: row.cover,
    coverAlt: row.cover_alt ?? "",
    coverFocus: { x: row.cover_focus_x ?? 50, y: row.cover_focus_y ?? 50 },
    bgColor: row.bg_color || DEFAULT_BACKGROUND,
    publishedAt: row.published_at,
    readingTime: row.reading_time,
  };
}

export async function createPost(input: PostInput): Promise<number> {
  const rows = await query<{ id: number }>(
    // `views` is left to its column default of 0 — a new article has been read
    // by nobody yet, and that is the number.
    `INSERT INTO posts (slug, title, meta_title, excerpt, content, blocks, category, cover, cover_alt,
     cover_focus_x, cover_focus_y, bg_color, published_at, reading_time)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [
      input.slug,
      input.title,
      input.metaTitle || null,
      input.excerpt,
      input.content,
      JSON.stringify(input.blocks),
      input.category,
      input.cover,
      input.coverAlt,
      input.coverFocus.x,
      input.coverFocus.y,
      input.bgColor,
      input.publishedAt,
      input.readingTime,
    ]
  );
  return rows[0].id;
}

export async function updatePost(id: number, input: PostInput): Promise<void> {
  await query(
    // Deliberately no `views` column here — see PostInput.
    `UPDATE posts SET slug=$1, title=$2, meta_title=$3, excerpt=$4, content=$5, blocks=$6::jsonb,
     category=$7, cover=$8, cover_alt=$9, cover_focus_x=$10, cover_focus_y=$11, bg_color=$12,
     published_at=$13, reading_time=$14, updated_at=now()
     WHERE id=$15`,
    [
      input.slug,
      input.title,
      input.metaTitle || null,
      input.excerpt,
      input.content,
      JSON.stringify(input.blocks),
      input.category,
      input.cover,
      input.coverAlt,
      input.coverFocus.x,
      input.coverFocus.y,
      input.bgColor,
      input.publishedAt,
      input.readingTime,
      id,
    ]
  );
}

export async function deletePost(id: number): Promise<void> {
  await query(`DELETE FROM posts WHERE id = $1`, [id]);
}

export async function countPosts(): Promise<number> {
  const rows = await query<{ n: string }>(`SELECT COUNT(*) as n FROM posts`);
  return toNumber(rows[0].n);
}
