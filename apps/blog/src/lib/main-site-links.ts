/**
 * Where the blog's outbound links point on the main Astro AI site.
 *
 * The main site serves each section twice: a public marketing page
 * (`/natal`), and the working one behind the login (`/forecast/natal`). Its
 * own header swaps between the two on exactly this prefix, with the same four
 * labels either way — the blog mirrors that rather than inventing a mapping,
 * so a reader who is already signed in lands in the product instead of on the
 * pitch for it.
 *
 * Pure on purpose: no `server-only`, no env reads. The origin and whether the
 * reader is signed in are both worked out on the server (lib/site.ts) and
 * passed in, so the client-side header can use these too.
 */

/** The four sections, in the order the main site's own header lists them. */
export const MAIN_SITE_SECTIONS = [
  { label: "Натальная карта", path: "/natal" },
  { label: "Прогнозы", path: "/prediction" },
  { label: "Совместимость", path: "/compatibility" },
  { label: "Ответы на вопросы", path: "/answers" },
] as const;

const SIGNED_IN_PREFIX = "/forecast";

/** Which section a reader arriving from the blog should land in. The natal
 * chart is first in the main site's own navigation and is what the article
 * call-to-action offers, so it is the one both of them open. */
const ENTRY_PATH = `${SIGNED_IN_PREFIX}/natal`;

/** A section's URL — the public page, or the one behind the login. */
export function sectionHref(mainSite: string, path: string, signedIn: boolean): string {
  return `${mainSite}${signedIn ? SIGNED_IN_PREFIX : ""}${path}`;
}

/**
 * Where "Войти" and the article's call-to-action send the reader.
 *
 * Signed out, that is the login page with `?redirect=` — the main site's
 * login reads that parameter, keeps it, and navigates there once the code
 * checks out, so authenticating from the blog drops the reader into the
 * forecast rather than on the main site's front page. Signed in, there is
 * nothing to authenticate and the link goes straight there.
 */
export function startHref(mainSite: string, signedIn: boolean): string {
  return signedIn
    ? `${mainSite}${ENTRY_PATH}`
    : `${mainSite}/login?redirect=${encodeURIComponent(ENTRY_PATH)}`;
}

/** What the header's button says. Signed in, "Войти" would be nonsense, and
 * the main site calls the same control "Профиль". */
export function accountLink(mainSite: string, signedIn: boolean): { label: string; href: string } {
  return signedIn
    ? { label: "Профиль", href: `${mainSite}/profile` }
    : { label: "Войти", href: startHref(mainSite, false) };
}
