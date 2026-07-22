import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";

const postsDirectory = path.join(process.cwd(), "src/content/posts");

export type PostMeta = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  cover: string;
  readingTime: number;
};

export type Post = PostMeta & { contentHtml: string };

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

export function getAllPosts(): PostMeta[] {
  return getAllSlugs()
    .map((slug) => {
      const raw = fs.readFileSync(path.join(postsDirectory, `${slug}.md`), "utf8");
      const { data, content } = matter(raw);
      return {
        slug,
        title: data.title as string,
        excerpt: data.excerpt as string,
        date: data.date as string,
        category: data.category as string,
        cover: data.cover as string,
        readingTime: readingTimeFromText(content),
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllCategories(): string[] {
  const categories = new Set(getAllPosts().map((post) => post.category));
  return Array.from(categories);
}

export async function getPostBySlug(slug: string): Promise<Post> {
  const raw = fs.readFileSync(path.join(postsDirectory, `${slug}.md`), "utf8");
  const { data, content } = matter(raw);
  const processed = await remark().use(remarkHtml).process(content);
  return {
    slug,
    title: data.title as string,
    excerpt: data.excerpt as string,
    date: data.date as string,
    category: data.category as string,
    cover: data.cover as string,
    readingTime: readingTimeFromText(content),
    contentHtml: processed.toString(),
  };
}

export function getRelatedPosts(current: PostMeta, limit = 2): PostMeta[] {
  return getAllPosts()
    .filter((post) => post.slug !== current.slug)
    .sort((a, b) => (a.category === current.category ? -1 : 0) - (b.category === current.category ? -1 : 0))
    .slice(0, limit);
}
