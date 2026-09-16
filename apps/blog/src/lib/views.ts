/**
 * The public view count an article is shown with.
 *
 * The stored counter is the real one — it starts at zero and only ever moves
 * when somebody opens the article — but a brand-new article showing "0" (or,
 * under the old floor, showing nothing at all) says the wrong thing about a
 * blog that is being read. So the number on the page is the real counter plus
 * a fixed head start, and the head start is what this file works out.
 *
 * It is derived from the slug rather than drawn at render time or stored in a
 * column, which buys two things: the same article shows the same number on
 * every request and in every container (a fresh `Math.random()` per render
 * would have the count flickering as the reader moves between the grid and
 * the article), and nothing has to be written to the database for it.
 *
 * The real counter is untouched — the admin list still shows actual reads.
 */

/** Inclusive bounds of the head start. */
const BASE_MIN = 850;
const BASE_MAX = 1000;

/** FNV-1a, 32-bit. Any stable string→number hash would do; this one is four
 * lines and spreads short, similar slugs (which is what article slugs are)
 * across the whole range instead of clustering them. */
function hashSlug(slug: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    // The 32-bit FNV prime, as shifts: `hash * 16777619` overflows the 53-bit
    // float mantissa and loses low bits, `Math.imul` wraps like C would.
    hash = Math.imul(hash, 0x01000193);
  }
  // `>>> 0` turns the signed 32-bit result of imul back into 0…2³²-1.
  return hash >>> 0;
}

/** The article's head start — the same number for a given slug, always. */
export function viewBaseline(slug: string): number {
  return BASE_MIN + (hashSlug(slug) % (BASE_MAX - BASE_MIN + 1));
}

/** What the reader sees: the head start plus every real read since. */
export function publicViews(post: { slug: string; views: number }): number {
  return viewBaseline(post.slug) + post.views;
}
