import "server-only";
import { connection } from "next/server";
import { remark } from "remark";
import remarkHtml from "remark-html";
import { db } from "@/lib/db";
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
  // better-sqlite3 reads are synchronous and don't count as a Next.js
  // "dynamic API" on their own, so without this, `next build` would bake
  // this page's output into static HTML once and never touch the DB again.
  await connection();
  const rows = db.prepare(`SELECT * FROM posts ORDER BY published_at DESC`).all() as PostRow[];
  return rows.map(rowToMeta);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  await connection();
  const row = db.prepare(`SELECT * FROM posts WHERE slug = ?`).get(slug) as PostRow | undefined;
  if (!row) return null;

  const processed = await remark().use(remarkHtml).process(row.content);

  return {
    ...rowToMeta(row),
    contentHtml: processed.toString(),
    comments: getApprovedComments(row.id),
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

export function incrementViews(slug: string): void {
  db.prepare(`UPDATE posts SET views = views + 1 WHERE slug = ?`).run(slug);
}

// ---------- admin-only CRUD (called from Server Actions, already
// requireAdmin()-gated at the call site) ----------

export type PostInput = {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  cover: string;
  publishedAt: string;
  views: number;
};

export function getPostById(id: number): (PostInput & { id: number }) | null {
  const row = db.prepare(`SELECT * FROM posts WHERE id = ?`).get(id) as PostRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    category: row.category,
    cover: row.cover,
    publishedAt: row.published_at,
    views: row.views,
  };
}

export function createPost(input: PostInput): number {
  const result = db
    .prepare(
      `INSERT INTO posts (slug, title, excerpt, content, category, cover, published_at, views)
       VALUES (@slug, @title, @excerpt, @content, @category, @cover, @publishedAt, @views)`
    )
    .run(input);
  return Number(result.lastInsertRowid);
}

export function updatePost(id: number, input: PostInput): void {
  db.prepare(
    `UPDATE posts SET slug=@slug, title=@title, excerpt=@excerpt, content=@content,
     category=@category, cover=@cover, published_at=@publishedAt, views=@views,
     updated_at=datetime('now') WHERE id=@id`
  ).run({ ...input, id });
}

export function deletePost(id: number): void {
  db.prepare(`DELETE FROM posts WHERE id = ?`).run(id);
}

export function countPosts(): number {
  return (db.prepare(`SELECT COUNT(*) as n FROM posts`).get() as { n: number }).n;
}
