import { NextResponse, type NextRequest } from "next/server";
import { incrementViews } from "@/lib/posts";

/** Which articles this browser has already been counted for, and on what day.
 * Format: `2026-08-10|slug-one,slug-two`. Slugs are `[a-z0-9-]+` (see
 * `slugify`), so neither separator can occur inside one. */
const COOKIE_NAME = "blog_viewed";

/** A reader who opens this many articles in one day is already counted for
 * every one that matters; the cap is only here to stop the cookie growing
 * without bound. */
const MAX_SLUGS_PER_DAY = 200;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Seconds until the next UTC midnight — the cookie's whole job is to say
 * "already counted *today*", so it should expire when today does. */
function secondsLeftInDay(): number {
  const now = new Date();
  const midnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  );
  return Math.ceil((midnight - now.getTime()) / 1000);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const raw = req.cookies.get(COOKIE_NAME)?.value ?? "";
  const [day, list = ""] = raw.split("|");
  // A cookie from an earlier day is not carried over — that's what makes this
  // "one view per reader per day" rather than "ever".
  const seen = day === today() ? list.split(",").filter(Boolean) : [];

  if (seen.includes(slug)) {
    return NextResponse.json({ ok: true, counted: false });
  }

  if (!(await incrementViews(slug))) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const updated = [...seen, slug].slice(-MAX_SLUGS_PER_DAY);
  const res = NextResponse.json({ ok: true, counted: true });
  res.cookies.set(COOKIE_NAME, `${today()}|${updated.join(",")}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: secondsLeftInDay(),
    secure: process.env.COOKIE_SECURE === "true",
  });
  return res;
}
