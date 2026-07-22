import BlogGrid from "@/components/BlogGrid";
import CloudDivider from "@/components/CloudDivider";
import { getAllPosts, getAllCategories } from "@/lib/posts";

export default function BlogHome() {
  const posts = getAllPosts();
  const categories = getAllCategories();

  return (
    <>
      <section className="starfield" style={{ padding: "96px 0 120px" }}>
        <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.2rem)", marginBottom: 24 }}>
            Блог Astro AI
          </h1>
          <p
            style={{
              maxWidth: 640,
              margin: "0 auto",
              color: "var(--beige-bg)",
              opacity: 0.8,
              fontSize: "1.1rem",
            }}
          >
            Ведическая астрология простыми словами: натальные карты, совместимость, прогнозы и то,
            как искусственный интеллект помогает точнее и быстрее понимать звёздную карту.
          </p>
        </div>
      </section>

      <CloudDivider fill="#fbf2e1" />

      <section style={{ background: "var(--beige-bg)", color: "var(--brown)", paddingBottom: 100 }}>
        <div className="container">
          <BlogGrid posts={posts} categories={categories} />
        </div>
      </section>
    </>
  );
}
