import "server-only";

import { cookies } from "next/headers";

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

/**
 * The cookie the main site writes when a reader logs in. It holds a JWT, but
 * the blog never looks inside it and never trusts it for anything: there is
 * nothing here to authorise, only a choice between two sets of links. Its
 * mere presence is the hint that the reader has an account open.
 *
 * ⚠ The main site currently writes it as `accessToken=…; path=/` with no
 * `domain=`, which makes it host-only — `aiastro.ru` sends it to itself and
 * nowhere else, so the blog, on `blog.aiastro.ru`, never receives it and this
 * reads `false` for everyone. Adding `; domain=.aiastro.ru` to those writes on
 * the main site is what switches this on; until then the blog behaves exactly
 * as it does today, which is why the fallback is the signed-out links.
 */
const AUTH_COOKIE = "accessToken";

/** Whether the reader has a session open on the main site. */
export async function readerIsSignedIn(): Promise<boolean> {
  return (await cookies()).has(AUTH_COOKIE);
}
