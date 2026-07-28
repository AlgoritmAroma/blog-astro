import Image from "next/image";
import { notFound } from "next/navigation";
import CloudDivider from "@/components/CloudDivider";
import PostCard from "@/components/PostCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import ShareButtons from "@/components/ShareButtons";
import AuthorBox from "@/components/AuthorBox";
import Comments from "@/components/Comments";
import ViewTracker from "@/components/ViewTracker";
import { getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { formatDate, formatViews } from "@/lib/format";
import { submitCommentAction } from "./actions";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return notFound();

  const related = await getRelatedPosts(post);

  return (
    <>
      <ViewTracker slug={post.slug} />
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
            <span>·</span>
            <span>{formatViews(post.views)} просмотров</span>
            <span>·</span>
            <span>{post.readingTime} мин чтения</span>
            <ShareButtons title={post.title} compact />
          </div>
        </div>
      </section>

      <CloudDivider fill="#fbf2e1" />

      <section style={{ background: "var(--beige-bg)", paddingBottom: 96 }}>
        <div className="container" style={{ maxWidth: 820 }}>
          <div
            className="arch"
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              position: "relative",
              margin: "-140px auto 48px",
              maxWidth: 640,
            }}
          >
            <Image src={post.cover} alt={post.title} fill sizes="640px" style={{ objectFit: "cover" }} />
          </div>

          <article className="prose" dangerouslySetInnerHTML={{ __html: post.contentHtml }} />

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
        <section style={{ background: "var(--beige-bg)", paddingBottom: 100 }}>
          <div className="container">
            <h2 style={{ marginBottom: 32, fontSize: "1.6rem", color: "var(--marsh)" }}>
              Похожие статьи
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "48px 32px",
              }}
            >
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
