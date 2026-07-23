import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import type { Comment, Post, PostMeta } from "@/lib/blog";

export type { PostMeta, Post, Comment, Category } from "@/lib/blog";

const postsDirectory = path.join(process.cwd(), "src/content/posts");

function readingTimeFromText(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export function getAllSlugs(): string[] {
  return fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => file.replace(/\.md$/, ""));
}

function metaFromFrontmatter(slug: string, data: Record<string, unknown>, content: string): PostMeta {
  return {
    slug,
    title: data.title as string,
    excerpt: data.excerpt as string,
    date: data.date as string,
    category: data.category as string,
    cover: data.cover as string,
    readingTime: readingTimeFromText(content),
    views: typeof data.views === "number" ? data.views : 1000,
  };
}

export function getAllPosts(): PostMeta[] {
  return getAllSlugs()
    .map((slug) => {
      const raw = fs.readFileSync(path.join(postsDirectory, `${slug}.md`), "utf8");
      const { data, content } = matter(raw);
      return metaFromFrontmatter(slug, data, content);
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const raw = fs.readFileSync(path.join(postsDirectory, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  const processed = await remark().use(remarkHtml).process(content);
  const comments = Array.isArray(data.comments) ? (data.comments as Comment[]) : [];
  return {
    ...metaFromFrontmatter(slug, data, content),
    contentHtml: processed.toString(),
    comments,
  };
}

export function getRelatedPosts(current: PostMeta, limit = 2): PostMeta[] {
  const sameCategory = getAllPosts().filter(
    (post) => post.slug !== current.slug && post.category === current.category
  );
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit);

  const others = getAllPosts().filter(
    (post) => post.slug !== current.slug && post.category !== current.category
  );
  return [...sameCategory, ...others].slice(0, limit);
}
