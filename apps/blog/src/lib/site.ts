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
 * ⚠ For this to say anything at all, the main site has to write the cookie on
 * the *parent* domain. It currently writes `accessToken=…; path=/` with no
 * `domain=`, which makes it host-only — `aiastro.ru` sends it to itself and
 * nowhere else, so the blog, on `blog.aiastro.ru`, never receives it and this
 * reads `false` for everyone. The fix is `; domain=.aiastro.ru` on every
 * `document.cookie` write of `accessToken`/`refreshToken` **and on the two
 * that clear them on logout** — a deletion without the `domain=` cannot
 * remove a cookie that was set with one, and a reader who logged out would go
 * on looking signed-in to the blog forever.
 *
 * Nothing else can stand in for it from this side: the token also lives in
 * the main site's `localStorage`, which is per-origin, and `api.aiastro.ru`
 * answers with `Access-Control-Allow-Origin: *`, which by the CORS rules
 * forbids sending credentials at all. Until that one-line change lands the
 * blog behaves exactly as it does today, which is why the fallback is the
 * signed-out links.
 */
const AUTH_COOKIE = "accessToken";

/**
 * Whether the reader has a session open on the main site.
 *
 * The value has to be non-empty, not merely present: clearing a cookie in the
 * browser is writing an empty one with an expiry in the past, and a cookie
 * caught mid-deletion (or one an older logout left behind) is exactly the
 * case where showing "Профиль" to a signed-out reader would be worst.
 */
export async function readerIsSignedIn(): Promise<boolean> {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return Boolean(token && token.trim());
}
