import "server-only";

/**
 * Origin of the main Astro AI site — everything in the header, the footer and
 * the "Главная" breadcrumb points at it, and the blog itself lives on a
 * subdomain of it.
 *
 * It comes from the environment rather than a constant because dev and prod
 * run the *same* image: the dev blog has to send readers to the dev site, not
 * to the live one. `MAIN_SITE_URL` is deliberately not a `NEXT_PUBLIC_` var —
 * those are inlined at build time, which would freeze the production domain
 * into the image and make the dev container link straight into prod. This is
 * read on the server, per request, and handed to the header and footer as a
 * prop, so the value is whatever that container's `.env` says today.
 *
 * The fallback is the live site: a container started without the var behaves
 * exactly as the blog did before the var existed.
 */
export function mainSiteUrl(): string {
  const fromEnv = process.env.MAIN_SITE_URL?.trim();
  // A trailing slash would turn every `${MAIN_SITE}/natal` into a `//natal`.
  return fromEnv ? fromEnv.replace(/\/+$/, "") : "https://aiastro.ru";
}
