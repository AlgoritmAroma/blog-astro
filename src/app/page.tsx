import type { Metadata } from "next";
import BlogGrid from "@/components/BlogGrid";
import CloudDivider from "@/components/CloudDivider";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Блог об астрологии, натальных картах и совместимости — ИИ Astro",
  description:
    "Полезные статьи об астрологии, натальных картах, совместимости партнеров, знаках зодиака и астрологических прогнозах. Читайте экспертные материалы, рекомендации и ответы на популярные вопросы от AI Astro для самопознания и принятия важных жизненных решений.",
};

export default async function BlogHome() {
  const posts = await getAllPosts();

  return (
    <>
      <section style={{ padding: "24px 0 96px" }}>
        <div className="container" style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <Breadcrumbs items={[{ label: "Главная", href: "https://aiastro.ru" }, { label: "Блог" }]} />
          <h1 style={{ margin: "24px 0" }}>Блог</h1>
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
          <BlogGrid posts={posts} />
        </div>
      </section>
    </>
  );
}
