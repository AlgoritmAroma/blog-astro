import "server-only";
import { connection } from "next/server";
import { query, toNumber } from "@/lib/db";
import type { PostMeta } from "@/lib/blog";

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
  excerpt: string;
  content: string;
  category: string;
  cover: string;
  publishedAt: string;
  views: number;
};

export async function getPostById(id: number): Promise<(PostInput & { id: number }) | null> {
  const rows = await query<PostRow>(`SELECT * FROM posts WHERE id = $1`, [id]);
  const row = rows[0];
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

export async function createPost(input: PostInput): Promise<number> {
  const rows = await query<{ id: number }>(
    `INSERT INTO posts (slug, title, excerpt, content, category, cover, published_at, views)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [input.slug, input.title, input.excerpt, input.content, input.category, input.cover, input.publishedAt, input.views]
  );
  return rows[0].id;
}

export async function updatePost(id: number, input: PostInput): Promise<void> {
  await query(
    `UPDATE posts SET slug=$1, title=$2, excerpt=$3, content=$4,
     category=$5, cover=$6, published_at=$7, views=$8, updated_at=now()
     WHERE id=$9`,
    [
      input.slug,
      input.title,
      input.excerpt,
      input.content,
      input.category,
      input.cover,
      input.publishedAt,
      input.views,
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
