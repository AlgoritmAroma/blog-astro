// Client-safe blog types/utilities — no fs/gray-matter/remark imports here,
// so client components (BlogGrid, PostCard, CategorySidebar, Comments) can
// import from this module without pulling Node-only APIs into the browser bundle.

import type { Block } from "./blocks";

// Rubrics used to be a fixed 8-item tuple here. They now live in the
// `categories` table so an editor can add their own from the admin (the
// original 8 are seeded in lib/db.ts), which is why this is a plain string.
export type Category = string;

export type CommentStatus = "pending" | "approved" | "rejected";

export type Comment = {
  id: number;
  name: string;
  date: string;
  text: string;
  status: CommentStatus;
};

export type PostMeta = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  cover: string;
  coverAlt: string;
  readingTime: number;
  views: number;
};

export type Post = PostMeta & {
  /** Structured body from the article constructor. Empty for articles that
   * predate it — those fall back to `contentHtml`. */
  blocks: Block[];
  bgColor: string;
  contentHtml: string;
  comments: Comment[];
};

export const PAGE_SIZE = 20;

export function getPageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function paginate<T>(items: T[], page: number, pageSize: number = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
