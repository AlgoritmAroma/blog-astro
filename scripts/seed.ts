// One-off idempotent migration: import the markdown posts under
// src/content/posts/*.md into the sqlite `posts` (+ `comments`, if any were
// present in frontmatter) tables. Safe to re-run — existing slugs are
// skipped. Run via `npm run db:seed`.
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { db } from "../src/lib/db";

type Comment = { name: string; date: string; text: string };

const postsDirectory = path.join(process.cwd(), "src/content/posts");

function readingTimeFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

const insertPost = db.prepare(`
  INSERT INTO posts (slug, title, excerpt, content, category, cover, published_at, views)
  VALUES (@slug, @title, @excerpt, @content, @category, @cover, @publishedAt, @views)
  ON CONFLICT(slug) DO NOTHING
`);

const insertComment = db.prepare(`
  INSERT INTO comments (post_id, name, text, status, created_at)
  VALUES (@postId, @name, @text, 'approved', @createdAt)
`);

const getPostId = db.prepare(`SELECT id FROM posts WHERE slug = ?`);

const files = fs.readdirSync(postsDirectory).filter((f) => f.endsWith(".md"));

let inserted = 0;
let skipped = 0;

for (const file of files) {
  const slug = file.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(postsDirectory, file), "utf8");
  const { data, content } = matter(raw);

  // reading time isn't stored — computed at request time from `content` —
  // but calling it here anyway would be dead code, so we don't.
  void readingTimeFromText;

  const result = insertPost.run({
    slug,
    title: data.title as string,
    excerpt: data.excerpt as string,
    content: content.trim(),
    category: data.category as string,
    cover: data.cover as string,
    publishedAt: data.date as string,
    views: typeof data.views === "number" ? data.views : 1000,
  });

  if (result.changes > 0) {
    inserted++;
    console.log(`inserted: ${slug}`);

    const comments = Array.isArray(data.comments) ? (data.comments as Comment[]) : [];
    if (comments.length > 0) {
      const row = getPostId.get(slug) as { id: number } | undefined;
      if (row) {
        for (const c of comments) {
          insertComment.run({
            postId: row.id,
            name: c.name,
            text: c.text,
            createdAt: c.date ?? new Date().toISOString(),
          });
        }
        console.log(`  + ${comments.length} pre-existing comment(s) migrated as approved`);
      }
    }
  } else {
    skipped++;
    console.log(`skipped (already exists): ${slug}`);
  }
}

console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
