// Client-safe blog types/utilities — no fs/gray-matter/remark imports here,
// so client components (BlogGrid, PostCard, CategorySidebar, Comments) can
// import from this module without pulling Node-only APIs into the browser bundle.

// The 8 fixed rubrics from the blog spec — shown in full in the sidebar
// regardless of how many posts each currently has.
export const ALL_CATEGORIES = [
  "Натальная карта",
  "Совместимость",
  "Астрологические прогнозы",
  "Знаки зодиака",
  "Любовь и отношения",
  "Самопознание",
  "Ведическая астрология",
  "Планеты и их влияние",
] as const;

export type Category = (typeof ALL_CATEGORIES)[number];

export type Comment = {
  name: string;
  date: string;
  text: string;
};

export type PostMeta = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  cover: string;
  readingTime: number;
  views: number;
};

export type Post = PostMeta & { contentHtml: string; comments: Comment[] };

export const PAGE_SIZE = 20;

export function getPageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function paginate<T>(items: T[], page: number, pageSize: number = PAGE_SIZE): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
