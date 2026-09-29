/**
 * The blog's own record that the reader arrived from the main site's
 * signed-in area (`/forecast`). Set by proxy.ts from `?from=forecast`,
 * read by lib/site.ts. Like the `accessToken` check next to it, it only
 * picks between two sets of links and authorises nothing.
 *
 * It lasts 12 hours rather than forever: the main site's logout can't reach
 * a cookie on the blog's domain, so a reader who has logged out there would
 * otherwise keep being sent into `/forecast` (and bounced to its login) for
 * good.
 */
export const FROM_FORECAST_COOKIE = "fromForecast";
export const FROM_FORECAST_MAX_AGE = 60 * 60 * 12;
