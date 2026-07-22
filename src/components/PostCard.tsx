import Image from "next/image";
import Link from "next/link";
import type { PostMeta } from "@/lib/posts";
import { withBasePath } from "@/lib/basePath";

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <div
        className="arch"
        style={{
          width: "100%",
          aspectRatio: "3 / 4",
          position: "relative",
        }}
      >
        <Image
          src={withBasePath(post.cover)}
          alt={post.title}
          fill
          sizes="(max-width: 720px) 100vw, 360px"
          style={{ objectFit: "cover" }}
        />
      </div>

      <div>
        <span className="tag" style={{ marginBottom: 4 }}>
          {post.category}
        </span>
        <h3 style={{ fontSize: "1.25rem", margin: "12px 0 8px" }}>{post.title}</h3>
        <p style={{ fontSize: "0.95rem", opacity: 0.75, marginBottom: 10 }}>{post.excerpt}</p>
        <div style={{ display: "flex", gap: 12, fontSize: "0.8rem", opacity: 0.55 }}>
          <span>{formatDate(post.date)}</span>
          <span>·</span>
          <span>{post.readingTime} мин чтения</span>
        </div>
      </div>
    </Link>
  );
}
