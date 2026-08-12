import Image from "next/image";
import { notFound } from "next/navigation";
import CloudDivider from "@/components/CloudDivider";
import PostCard from "@/components/PostCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import ShareButtons from "@/components/ShareButtons";
import AuthorBox from "@/components/AuthorBox";
import Comments from "@/components/Comments";
import PostBlocks from "@/components/PostBlocks";
import ViewTracker from "@/components/ViewTracker";
import { stripInlineHtml } from "@/lib/blocks";
import { coverAspectRatio } from "@/lib/cover-frame";
import { getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { formatDate, formatViewCount, formatReadingTime } from "@/lib/format";
import { MIN_PUBLIC_VIEWS } from "@/lib/blog";
import { submitCommentAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    // `absolute` skips the layout's "%s — Блог Astro AI" template: an SEO
    // title is written to a length budget, and silently appending 17 more
    // characters is what pushes it past what Google shows. Without one of its
    // own the article falls back to the H1, which the template still suffixes
    // exactly as before.
    title: post.metaTitle ? { absolute: post.metaTitle } : post.title,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return notFound();

  const related = await getRelatedPosts(post);

  // Google reads FAQ blocks as a rich result. Built from the same sanitized
  // strings the page renders, flattened to plain text as the spec requires.
  const faqItems = post.blocks
    .filter((block) => block.type === "faq")
    .flatMap((block) => block.items);

  return (
    <>
      <ViewTracker slug={post.slug} />
      {faqItems.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faqItems.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: stripInlineHtml(item.a) },
              })),
            }),
          }}
        />
      )}
      <section style={{ padding: "24px 0 56px" }}>
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <Breadcrumbs
            items={[
              { label: "Главная", href: "https://aiastro.ru" },
              { label: "Блог", href: "/" },
              { label: post.category },
              { label: post.title },
            ]}
          />
          <span className="tag" style={{ margin: "20px 0", display: "inline-flex" }}>
            {post.category}
          </span>
          <h1 style={{ fontSize: "var(--h2)", maxWidth: 820, margin: "16px 0" }}>{post.title}</h1>
          <div className="post-meta-row">
            <span>{formatDate(post.date)}</span>
            {post.views >= MIN_PUBLIC_VIEWS && (
              <>
                <span>·</span>
                <span>{formatViewCount(post.views)}</span>
              </>
            )}
            <span>·</span>
            <span>{formatReadingTime(post.readingTime)} чтения</span>
            <ShareButtons title={post.title} compact />
          </div>
        </div>
      </section>

      <CloudDivider fill={post.bgColor} />

      {/* `flow-root` is load-bearing: the cover's negative top margin is on
          this section's first child, and without a block formatting context
          it collapses straight through the section's top edge and drags the
          whole beige block up with it. That is what has been hiding the cloud
          divider — the background started 10px above the wave and painted
          over all 90px of it. With the context established, the margin moves
          the cover alone and the wave stays visible either side of it. */}
      <section style={{ background: post.bgColor, paddingBottom: 96, display: "flow-root" }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div
            className="cover-frame"
            style={{
              width: "100%",
              // Half the divider's 90px, so the cover tucks into the wave
              // rather than clearing it or hiding it, and the gap underneath
              // is the same order as the overlap above.
              margin: "-45px auto 56px",
              maxWidth: 640,
              aspectRatio: coverAspectRatio(post.coverSize, "article"),
            }}
          >
            <Image
              src={post.cover}
              alt={post.coverAlt}
              fill
              sizes="(max-width: 880px) 90vw, 640px"
              style={{
                objectFit: "cover",
                objectPosition: `${post.coverFocus.x}% ${post.coverFocus.y}%`,
              }}
            />
          </div>

          {/* Articles from the block constructor render structurally; the ones
              that predate it still come through remark as raw HTML. */}
          {post.blocks.length > 0 ? (
            <PostBlocks blocks={post.blocks} />
          ) : (
            <article className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />
          )}

          <div className="post-share-block">
            <ShareButtons title={post.title} />
          </div>

          <AuthorBox />

          <div
            style={{
              marginTop: 56,
              padding: "40px",
              borderRadius: 24,
              background: "var(--black)",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: 16, fontSize: "1.5rem" }}>Готовы узнать свою натальную карту?</h3>
            <p style={{ color: "var(--orange)", opacity: 0.85, marginBottom: 24 }}>
              Персональный расчёт, прогнозы и совместимость — бесплатно, за пару минут.
            </p>
            <a href="https://aiastro.ru/login" className="btn">
              Попробовать бесплатно
            </a>
          </div>

          <Comments comments={post.comments} action={submitCommentAction.bind(null, post.id)} />
        </div>
      </section>

      {related.length > 0 && (
        <section style={{ background: post.bgColor, paddingBottom: 100 }}>
          <div className="container">
            <h2 style={{ marginBottom: 32, fontSize: "1.6rem", color: "var(--marsh)" }}>
              Похожие статьи
            </h2>
            <div className="post-grid">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
