// One-off idempotent migration: import the markdown posts under
// src/content/posts/*.md into the postgres `posts` (+ `comments`, if any
// were present in frontmatter) tables. Safe to re-run — existing slugs are
// skipped. Run via `npm run db:seed`.
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { pool, query } from "../src/lib/db";

type Comment = { name: string; date: string; text: string };

const postsDirectory = path.join(process.cwd(), "src/content/posts");

async function main() {
  const files = fs.readdirSync(postsDirectory).filter((f) => f.endsWith(".md"));

  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const raw = fs.readFileSync(path.join(postsDirectory, file), "utf8");
    const { data, content } = matter(raw);

    const rows = await query<{ id: number }>(
      // The `views:` value in the markdown frontmatter is ignored: the counter
      // on the site is a real one, and an imported article has been read by
      // nobody yet. `views` falls to its column default of 0.
      `INSERT INTO posts (slug, title, excerpt, content, category, cover, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (slug) DO NOTHING
       RETURNING id`,
      [
        slug,
        data.title as string,
        data.excerpt as string,
        content.trim(),
        data.category as string,
        data.cover as string,
        data.date as string,
      ]
    );

    if (rows.length > 0) {
      inserted++;
      console.log(`inserted: ${slug}`);

      const comments = Array.isArray(data.comments) ? (data.comments as Comment[]) : [];
      if (comments.length > 0) {
        const postId = rows[0].id;
        for (const c of comments) {
          await query(
            `INSERT INTO comments (post_id, name, text, status, created_at)
             VALUES ($1, $2, $3, 'approved', $4)`,
            [postId, c.name, c.text, c.date ?? new Date().toISOString()]
          );
        }
        console.log(`  + ${comments.length} pre-existing comment(s) migrated as approved`);
      }
    } else {
      skipped++;
      console.log(`skipped (already exists): ${slug}`);
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
