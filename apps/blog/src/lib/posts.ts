import "server-only";
import { connection } from "next/server";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { query } from "@/lib/db";
import { getApprovedComments } from "@/lib/comments";
import { parseBlocks, DEFAULT_BACKGROUND } from "@/lib/blocks";
import type { Post, PostMeta } from "@/lib/blog";

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

/** Public-facing: all posts, newest first. Forces dynamic rendering (see
 * comment on `connection()` below) so admin edits show up without a rebuild. */
export async function getAllPosts(): Promise<PostMeta[]> {
  // A plain DB read doesn't count as a Next.js "dynamic API" on its own, so
  // without this, `next build` would bake this page's output into static
  // HTML once and never touch the DB again.
  await connection();
  const rows = await query<PostRow>(`SELECT * FROM posts ORDER BY published_at DESC`);
  return rows.map(rowToMeta);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  await connection();
  const rows = await query<PostRow>(`SELECT * FROM posts WHERE slug = $1`, [slug]);
  const row = rows[0];
  if (!row) return null;

  const blocks = parseBlocks(row.blocks);

  // Articles created before the block editor have `blocks` NULL and markdown
  // in `content` — those keep rendering through remark exactly as before.
  // Once such an article is re-saved from the admin it gains blocks and this
  // branch stops being used for it.
  const contentHtml =
    blocks.length > 0 ? "" : (await remark().use(remarkHtml).process(row.content)).toString();

  return {
    ...rowToMeta(row),
    blocks,
    bgColor: row.bg_color || DEFAULT_BACKGROUND,
    contentHtml,
    comments: await getApprovedComments(row.id),
  };
}

export async function getRelatedPosts(current: PostMeta, limit = 2): Promise<PostMeta[]> {
  await connection();
  const all = (await getAllPosts()).filter((post) => post.slug !== current.slug);
  const sameCategory = all.filter((post) => post.category === current.category);
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const others = all.filter((post) => post.category !== current.category);
  return [...sameCategory, ...others].slice(0, limit);
}

/** Returns false when the slug matches no article — the caller uses that to
 * avoid recording a made-up slug in the reader's "already counted" cookie. */
export async function incrementViews(slug: string): Promise<boolean> {
  const rows = await query<{ id: number }>(
    `UPDATE posts SET views = views + 1 WHERE slug = $1 RETURNING id`,
    [slug]
  );
  return rows.length > 0;
}
