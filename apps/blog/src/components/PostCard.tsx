import Image from "next/image";
import Link from "next/link";
import { MIN_PUBLIC_VIEWS, type PostMeta } from "@/lib/blog";
import { coverAspectRatio } from "@/lib/cover-frame";
import { formatDate, formatViewCount, formatReadingTime } from "@/lib/format";

export default function PostCard({ post }: { post: PostMeta }) {
  const href = `/blog/${post.slug}`;

  return (
    <article className="post-card">
      <Link href={href} className="post-card__cover-link">
        <div
          className="cover-frame"
          style={{ width: "100%", aspectRatio: coverAspectRatio(post.coverSize, "card") }}
        >
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(max-width: 720px) 100vw, 360px"
            style={{
              objectFit: "cover",
              objectPosition: `${post.coverFocus.x}% ${post.coverFocus.y}%`,
            }}
          />
        </div>
      </Link>

      <div className="post-card__body">
        <span className="tag">{post.category}</span>
        <Link href={href}>
          <h3 className="post-card__title">{post.title}</h3>
        </Link>
        <p className="post-card__excerpt">{post.excerpt}</p>

        <div className="post-card__footer">
          <div className="post-card__meta">
            <span>{formatDate(post.date)}</span>
            {post.views >= MIN_PUBLIC_VIEWS && (
              <>
                <span>·</span>
                <span>{formatViewCount(post.views)}</span>
              </>
            )}
            <span>·</span>
            <span>{formatReadingTime(post.readingTime)} чтения</span>
          </div>
          <Link href={href} className="post-card__more">
            Читать далее →
          </Link>
        </div>
      </div>
    </article>
  );
}
