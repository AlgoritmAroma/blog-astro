// Client-safe blog types/utilities — no fs/gray-matter/remark imports here,
// so client components (BlogGrid, PostCard, CategorySidebar, Comments) can
// import from this module without pulling Node-only APIs into the browser bundle.

import type { Block } from "./blocks";

// Rubrics used to be a fixed 8-item tuple here. They now live in the
// `categories` table and are created by the editor from the article form as
// articles need them — nothing is seeded — which is why this is a plain string.
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
  /** SEO <title>. Empty when the editor didn't write a separate one, in which
   * case the page falls back to `title`. */
  metaTitle: string;
  excerpt: string;
  date: string;
  category: string;
  cover: string;
  coverAlt: string;
  /** Which part of the cover survives when the frame *does* have to crop, as
   * CSS `object-position` percentages. A cover whose proportions fall inside
   * the frame's allowed band isn't cropped at all and ignores this; it
   * matters for the ones clamped at the edge of the band. */
  coverFocus: { x: number; y: number };
  /** Intrinsic size of the cover file, or null when it was never recorded.
   * The frame's shape is derived from it — see lib/cover-frame.ts. */
  coverSize: { width: number; height: number } | null;
  /** Whole minutes — the editor's override if they set one, otherwise
   * estimated from the article text. */
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

/** Below this the view count is hidden rather than shown. It is a real
 * counter now, and "3 просмотра" under a fresh article works against the
 * article — the number only starts saying something once there is something
 * to say. */
export const MIN_PUBLIC_VIEWS = 100;

export function getPageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function paginate<T>(items: T[], page: number, pageSize: number = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
