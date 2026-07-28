import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

export async function middleware(req: NextRequest) {
  // The matcher below covers /login too (Next matcher patterns don't
  // support excluding a sub-path directly), so exempt it explicitly here —
  // otherwise an unauthenticated visit to the login page redirects to
  // itself forever.
  if (req.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);

  if (!session.admin) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  // The whole app is the admin panel now (it's a separate deploy on its own
  // subdomain), so gate everything except the login page and Next internals
  // instead of matching a specific sub-path.
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
