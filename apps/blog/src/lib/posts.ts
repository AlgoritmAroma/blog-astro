import "server-only";
import { connection } from "next/server";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { query } from "@/lib/db";
import { getApprovedComments } from "@/lib/comments";
import type { Post, PostMeta } from "@/lib/blog";

export type { PostMeta, Post, Comment, Category, CommentStatus } from "@/lib/blog";

type PostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  cover: string;
  published_at: string;
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
    excerpt: row.excerpt,
    date: row.published_at,
    category: row.category,
    cover: row.cover,
    readingTime: readingTimeFromText(row.content),
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

  const processed = await remark().use(remarkHtml).process(row.content);

  return {
    ...rowToMeta(row),
    contentHtml: processed.toString(),
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

export async function incrementViews(slug: string): Promise<void> {
  await query(`UPDATE posts SET views = views + 1 WHERE slug = $1`, [slug]);
}
