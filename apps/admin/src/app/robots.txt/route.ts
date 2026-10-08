/**
 * The admin is never meant to be in a search index. The login page already
 * carries `noindex` (root layout) and every response gets `X-Robots-Tag`
 * (next.config.ts); this closes crawling outright as well. It is exempted
 * from the auth middleware, or a crawler would only ever see the redirect to
 * /login.
 */
export function GET() {
  return new Response("User-agent: *\nDisallow: /\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
