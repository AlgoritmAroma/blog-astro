"use client";

import { useMemo, useState } from "react";
import PostCard from "@/components/PostCard";
import CategorySidebar from "@/components/CategorySidebar";
import Pagination from "@/components/Pagination";
import { getPageCount, paginate, type PostMeta } from "@/lib/blog";

const PAGE_SIZE = 20;

export default function BlogGrid({ posts, categories }: { posts: PostMeta[]; categories: string[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => (active ? posts.filter((p) => p.category === active) : posts),
    [posts, active]
  );
  const pageCount = getPageCount(filtered.length, PAGE_SIZE);
  const pagePosts = paginate(filtered, page, PAGE_SIZE);

  function handleSelectCategory(category: string | null) {
    setActive(category);
    setPage(1);
  }

  function handlePageChange(next: number) {
    setPage(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="blog-layout">
      <div>
        {pagePosts.length > 0 ? (
          <div className="post-grid">
            {pagePosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p style={{ textAlign: "center", opacity: 0.6 }}>Пока нет статей в этой рубрике.</p>
        )}

        <Pagination page={page} pageCount={pageCount} onChange={handlePageChange} />
      </div>

      <CategorySidebar active={active} onSelect={handleSelectCategory} categories={categories} />
    </div>
  );
}
