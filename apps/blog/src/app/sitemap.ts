import type { MetadataRoute } from "next";
import { getSitemapPosts } from "@/lib/posts";
import { blogSiteUrl } from "@/lib/site";

/**
 * /sitemap.xml, built from the database on every request.
 *
 * Articles are published from the admin, a separate app that writes straight
 * into Postgres and never tells this one anything. A sitemap generated at
 * `next build` (Next's default for this file) would list the articles that
 * existed when the image was built and nothing after — so it is read per
 * request instead, the same way the listing and article pages are. The query
 * is one indexed scan of a few columns; crawlers fetch this a few times a
 * day, so there is nothing worth caching.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = blogSiteUrl();
  const posts = await getSitemapPosts();

  // The listing changes whenever any article does.
  const newest = posts.reduce<Date | undefined>(
    (latest, post) => (!latest || post.updatedAt > latest ? post.updatedAt : latest),
    undefined
  );

  return [
    { url: `${site}/`, lastModified: newest, changeFrequency: "daily", priority: 1 },
    ...posts.map((post) => ({
      url: `${site}/blog/${encodeURIComponent(post.slug)}`,
      lastModified: post.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
