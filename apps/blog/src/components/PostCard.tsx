import Image from "next/image";
import Link from "next/link";
import ClampedText from "@/components/ClampedText";
import { type PostMeta } from "@/lib/blog";
import { formatDate, formatViewCount, formatReadingTime } from "@/lib/format";
import { publicViews } from "@/lib/views";

export default function PostCard({ post }: { post: PostMeta }) {
  const href = `/blog/${post.slug}`;

  return (
    <article className="post-card">
      <Link href={href} className="post-card__cover-link">
        {/* No per-cover aspect ratio here: in the grid every card shows its
            cover in the same 3:2 frame the stylesheet gives it, and the focus
            point below decides what survives the crop. */}
        <div className="cover-frame" style={{ width: "100%" }}>
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
        <div className="post-card__tags">
          {post.categories.map((name) => (
            <span key={name} className="tag">
              {name}
            </span>
          ))}
        </div>
        <Link href={href}>
          <ClampedText as="h3" className="post-card__title" text={post.title} />
        </Link>
        <ClampedText className="post-card__excerpt" text={post.excerpt} />

        <div className="post-card__footer">
          <div className="post-card__meta">
            <span>{formatDate(post.date)}</span>
            <span>·</span>
            <span>{formatViewCount(publicViews(post))}</span>
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
