// Deliberately no `import "server-only"` and no import of `lib/db.ts` here —
// `sessionOptions`/`getSessionFromRequest` below are used from
// `src/middleware.ts`, which runs on the Edge runtime, so this whole module
// must stay free of Node-only/DB imports even though `getSession()` /
// `requireAdmin()` (built on `next/headers`) are only ever called from
// Node-runtime Server Components/Actions/Route Handlers, never middleware.
import { cookies } from "next/headers";
import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import type { NextRequest, NextResponse } from "next/server";

export type SessionData = {
  admin?: boolean;
};

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error(
    "SESSION_SECRET env var must be set to a random string of at least 32 characters. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}

export const sessionOptions: SessionOptions = {
  cookieName: "blog_admin_session",
  password: sessionSecret,
  cookieOptions: {
    // No TLS in front of this yet — hardcoding `secure: true` would make the
    // browser silently drop the cookie over plain HTTP and break login with
    // no visible error. Flip this once real TLS termination exists.
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    sameSite: "lax",
  },
};

/** For Server Components / Server Actions / Route Handlers (Node runtime). */
export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

/** For middleware (Edge runtime) — needs the request/response pair directly. */
export async function getSessionFromRequest(
  req: NextRequest,
  res: NextResponse
): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(req, res, sessionOptions);
}

/** Throws if there's no valid admin session. Call from every admin Server
 * Action / Route Handler in addition to the middleware gate — the
 * middleware's path matcher is not the only line of defense. */
export async function requireAdmin(): Promise<void> {
  const session = await getSession();
  if (!session.admin) {
    throw new Error("Unauthorized");
  }
}
