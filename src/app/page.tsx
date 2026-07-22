import BlogGrid from "@/components/BlogGrid";
import CloudDivider from "@/components/CloudDivider";
import { getAllPosts, getAllCategories } from "@/lib/posts";

export default function BlogHome() {
  const posts = getAllPosts();
  const categories = getAllCategories();

  return (
    <>
      <section className="starfield" style={{ padding: "48px 0 120px" }}>
        <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <h1 style={{ marginBottom: 24 }}>Блог Astro AI</h1>
          <p
            style={{
              maxWidth: 640,
              margin: "0 auto",
              color: "var(--orange)",
              opacity: 0.85,
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
