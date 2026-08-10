import Image from "next/image";
import Link from "next/link";
import type { PostMeta } from "@/lib/blog";
import { formatDate, formatViews, formatReadingTime } from "@/lib/format";

export default function PostCard({ post }: { post: PostMeta }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Link href={`/blog/${post.slug}`} style={{ display: "block" }}>
        <div
          className="arch"
          style={{
            width: "100%",
            aspectRatio: "3 / 4",
            position: "relative",
          }}
        >
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(max-width: 720px) 100vw, 360px"
            style={{ objectFit: "cover" }}
          />
        </div>
      </Link>

      <div>
        <span className="tag" style={{ marginBottom: 4 }}>
          {post.category}
        </span>
        <Link href={`/blog/${post.slug}`}>
          <h3 style={{ fontSize: "1.25rem", margin: "12px 0 8px" }}>{post.title}</h3>
        </Link>
        <p style={{ fontSize: "0.95rem", opacity: 0.75, marginBottom: 10 }}>{post.excerpt}</p>
        <div className="post-card__meta">
          <span>{formatDate(post.date)}</span>
          <span>·</span>
          <span>{formatViews(post.views)} просмотров</span>
          <span>·</span>
          <span>{formatReadingTime(post.readingTime)} чтения</span>
        </div>
        <Link href={`/blog/${post.slug}`} className="post-card__more">
          Читать далее →
        </Link>
      </div>
    </div>
  );
}
