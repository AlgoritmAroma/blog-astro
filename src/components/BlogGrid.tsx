"use client";

import { useState } from "react";
import PostCard from "@/components/PostCard";
import type { PostMeta } from "@/lib/posts";

export default function BlogGrid({
  posts,
  categories,
}: {
  posts: PostMeta[];
  categories: string[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const filtered = active ? posts.filter((p) => p.category === active) : posts;

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 48,
          justifyContent: "center",
        }}
      >
        <button
          type="button"
          onClick={() => setActive(null)}
          className={`tag${!active ? " is-active" : ""}`}
          style={{ cursor: "pointer" }}
        >
          Все статьи
        </button>
        {categories.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => setActive(category)}
            className={`tag${active === category ? " is-active" : ""}`}
            style={{ cursor: "pointer" }}
          >
            {category}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "48px 32px",
        }}
      >
        {filtered.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p style={{ textAlign: "center", opacity: 0.6 }}>Пока нет статей в этой категории.</p>
      )}
    </>
  );
}
