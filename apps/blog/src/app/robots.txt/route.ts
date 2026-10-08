import { blogSiteUrl } from "@/lib/site";

/**
 * /robots.txt. A route handler rather than Next's `app/robots.ts`, because
 * that one only knows the Google-style directives and Yandex's `Clean-param`
 * has to be written by hand.
 *
 * Everything public is open; only the view-counter API (POST-only, never a
 * page) is closed. Query parameters are not disallowed for
 * Google: a disallowed URL can't be fetched, so its canonical can't be seen
 * and the link's weight is lost; the canonical tag on every page folds
 * `?utm_…` copies into the clean URL instead, and the main site's `?from=`
 * hint is redirected away by proxy.ts. Yandex additionally gets
 * `Clean-param`, which stops it crawling those copies at all.
 *
 * No `Host:` — Yandex retired it in 2018 in favour of the 301 to the main
 * mirror. A crawler obeys only the most specific group that names it, so the
 * Yandex group repeats the shared rules rather than inheriting them.
 */
export const dynamic = "force-dynamic";

const CLEAN_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "yclid",
  "ysclid",
  "gclid",
  "fbclid",
  "etext",
  "from",
];

export function GET() {
  const site = blogSiteUrl();
  const shared = ["Allow: /", "Disallow: /api/"];

  const body = [
    "User-agent: *",
    ...shared,
    "",
    "User-agent: Yandex",
    ...shared,
    `Clean-param: ${CLEAN_PARAMS.join("&")}`,
    "",
    `Sitemap: ${site}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
