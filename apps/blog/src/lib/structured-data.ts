// Schema.org JSON-LD for the listing and the article pages. Everything here
// is derived from the rows the page itself renders, so publishing, deleting
// or re-slugging an article in the admin changes the markup on the next
// request with nobody editing JSON by hand.

import type { Post, PostMeta } from "@/lib/blog";

const LANGUAGE = "ru-RU";

/**
 * The company behind the blog. A constant, unlike the blog's own origin: the
 * `@id` is the organisation's identity, shared with the main site's markup,
 * and it must read the same from whichever host mentions it. The blog gets no
 * organisation of its own, and there is deliberately no `logo`.
 */
const ORGANIZATION_URL = "https://aiastro.ru/";
const ORGANIZATION_ID = `${ORGANIZATION_URL}#organization`;

const organization = {
  "@type": "Organization",
  "@id": ORGANIZATION_ID,
  name: "AI Astro",
  url: ORGANIZATION_URL,
  email: "info@aiastro.ru",
};

function website(site: string) {
  return {
    "@type": "WebSite",
    "@id": `${site}/#website`,
    url: `${site}/`,
    name: "Блог AI Astro",
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: LANGUAGE,
  };
}

/** The article's real address. The slug is the one stored in the CMS — the
 * same one the route and the sitemap use — never re-derived from the title. */
function postUrl(site: string, slug: string): string {
  return `${site}/blog/${encodeURIComponent(slug)}`;
}

function breadcrumbList(id: string, crumbs: { name: string; item: string }[]) {
  return {
    "@type": "BreadcrumbList",
    "@id": id,
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: crumb.item,
    })),
  };
}

/**
 * The listing page: Organization, WebSite, CollectionPage, ItemList and
 * BreadcrumbList in one `@graph`.
 *
 * `posts` are the articles the page shows, in the order it shows them
 * (newest first), so `position` is the card's place on the page.
 */
export function blogHomeGraph(site: string, posts: PostMeta[]) {
  const home = `${site}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website(site),
      {
        "@type": "CollectionPage",
        "@id": `${home}#blog`,
        url: home,
        name: "Блог AI Astro",
        description:
          "Блог AI Astro об астрологии, натальной карте, планетах, совместимости, прогнозах, самопознании и ведической астрологии.",
        isPartOf: { "@id": `${home}#website` },
        publisher: { "@id": ORGANIZATION_ID },
        inLanguage: LANGUAGE,
        breadcrumb: { "@id": `${home}#breadcrumb` },
        mainEntity: { "@id": `${home}#article-list` },
      },
      {
        "@type": "ItemList",
        "@id": `${home}#article-list`,
        name: "Статьи блога AI Astro",
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        numberOfItems: posts.length,
        itemListElement: posts.map((post, i) => {
          const url = postUrl(site, post.slug);
          return {
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "BlogPosting",
              "@id": `${url}#article`,
              // The H1 the article page shows, not the longer SEO title.
              headline: post.title,
              url,
              inLanguage: LANGUAGE,
              isPartOf: { "@id": `${home}#website` },
              publisher: { "@id": ORGANIZATION_ID },
            },
          };
        }),
      },
      breadcrumbList(`${home}#breadcrumb`, [
        { name: "AI Astro", item: ORGANIZATION_URL },
        { name: "Блог", item: home },
      ]),
    ],
  };
}

/**
 * `published_at` is the calendar day the editor picked; `updated_at` is the
 * instant of the last save. An article dated ahead of its last save would
 * otherwise claim to have been modified before it was published.
 */
function dateModified(post: Post): string {
  return post.updatedAt.slice(0, 10) > post.date ? post.updatedAt : post.date;
}

/** An article page: BlogPosting and its BreadcrumbList, tied to the same
 * Organization and WebSite nodes the listing declares. */
export function blogPostGraph(site: string, post: Post) {
  const home = `${site}/`;
  const url = postUrl(site, post.slug);
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      website(site),
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        headline: post.title,
        description: post.excerpt,
        inLanguage: LANGUAGE,
        datePublished: post.date,
        dateModified: dateModified(post),
        // Every article has a cover — the admin refuses to save one without.
        image: new URL(post.cover, home).toString(),
        // Rubrics as the editor ticked them in the CMS.
        ...(post.categories.length > 0 ? { articleSection: post.categories } : {}),
        author: { "@type": "Organization", "@id": ORGANIZATION_ID },
        publisher: { "@id": ORGANIZATION_ID },
        isPartOf: { "@id": `${home}#website` },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
      },
      breadcrumbList(`${url}#breadcrumb`, [
        { name: "AI Astro", item: ORGANIZATION_URL },
        { name: "Блог", item: home },
        { name: post.title, item: url },
      ]),
    ],
  };
}
