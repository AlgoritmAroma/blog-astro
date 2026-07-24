import { NextResponse, type NextRequest } from "next/server";
import { getSessionFromRequest } from "@/lib/session";

export async function middleware(req: NextRequest) {
  // The matcher below covers /admin/login too (Next matcher patterns don't
  // support excluding a sub-path directly), so exempt it explicitly here —
  // otherwise an unauthenticated visit to the login page redirects to
  // itself forever.
  if (req.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getSessionFromRequest(req, res);

  if (!session.admin) {
    const loginUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
