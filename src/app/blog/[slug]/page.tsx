import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CloudDivider from "@/components/CloudDivider";
import PostCard from "@/components/PostCard";
import { getAllPosts, getAllSlugs, getPostBySlug, getRelatedPosts } from "@/lib/posts";

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = getAllPosts();
  const meta = posts.find((p) => p.slug === slug);
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.excerpt,
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = getAllPosts();
  const meta = posts.find((p) => p.slug === slug);
  if (!meta) return notFound();

  const post = await getPostBySlug(slug);
  const related = getRelatedPosts(meta);

  return (
    <>
      <section className="starfield" style={{ padding: "72px 0 56px" }}>
        <div className="container" style={{ position: "relative", zIndex: 1 }}>
          <Link
            href="/"
            style={{ display: "inline-block", marginBottom: 24, color: "var(--orange)", opacity: 0.8 }}
          >
            ← Все статьи
          </Link>
          <span className="tag" style={{ marginBottom: 20, display: "inline-flex" }}>
            {post.category}
          </span>
          <h1 style={{ fontSize: "clamp(1.9rem, 4.5vw, 2.8rem)", maxWidth: 820, margin: "16px 0" }}>
            {post.title}
          </h1>
          <div style={{ display: "flex", gap: 12, fontSize: "0.9rem", opacity: 0.65 }}>
            <span>{formatDate(post.date)}</span>
            <span>·</span>
            <span>{post.readingTime} мин чтения</span>
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

          <div
            style={{
              marginTop: 56,
              padding: "40px",
              borderRadius: 24,
              background: "var(--black)",
              textAlign: "center",
            }}
          >
            <h3 style={{ marginBottom: 16 }}>Готовы узнать свою натальную карту?</h3>
            <p style={{ color: "var(--beige-bg)", opacity: 0.75, marginBottom: 24 }}>
              Персональный расчёт, прогнозы и совместимость — бесплатно, за пару минут.
            </p>
            <a href="https://aiastro.ru/login" className="btn">
              Попробовать бесплатно
            </a>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section style={{ background: "var(--beige-bg)", paddingBottom: 100 }}>
          <div className="container">
            <h2 style={{ marginBottom: 32, fontSize: "1.6rem", color: "var(--marsh)" }}>
              Читайте также
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
