import { NextResponse, type NextRequest } from "next/server";
import { FROM_FORECAST_COOKIE, FROM_FORECAST_MAX_AGE } from "@/lib/from-forecast";

/**
 * Picks up `?from=forecast` — the main site's hint that the reader came over
 * from its signed-in area — and turns it into a cookie on the blog's own
 * domain, so every page they open next keeps its links pointing into
 * `/forecast`. `?from=site` is the opposite hint and clears it.
 *
 * The parameter is then stripped with a redirect: it would otherwise stay in
 * the address bar, get copied into shared links (handing the next reader the
 * signed-in links) and split one article into two URLs for search engines.
 */
export function proxy(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from");
  if (from !== "forecast" && from !== "site") return NextResponse.next();

  const clean = req.nextUrl.clone();
  clean.searchParams.delete("from");
  const res = NextResponse.redirect(clean);

  if (from === "forecast") {
    res.cookies.set(FROM_FORECAST_COOKIE, "1", {
      path: "/",
      maxAge: FROM_FORECAST_MAX_AGE,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      httpOnly: true,
    });
  } else {
    res.cookies.delete(FROM_FORECAST_COOKIE);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
