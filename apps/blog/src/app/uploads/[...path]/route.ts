import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

/**
 * Serves an uploaded image straight off disk.
 *
 * Next's own `public/` serving cannot do this job: in production the router
 * lists `public/` once, at server start, and answers 404 for anything that
 * is not in that snapshot (`server/lib/router-utils/filesystem.js` — the
 * fallback that stats the filesystem per request only runs when `dev` is
 * true). The admin writes into the shared uploads volume while this server
 * is already running, so every image added after the last redeploy was
 * missing from the site until the container happened to restart.
 *
 * Files that were already on disk at boot keep being served by the static
 * handler, which matches before app routes; this handler picks up everything
 * uploaded since. next/image fetches through it too — the optimizer requests
 * local sources over HTTP from this same server.
 */
export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// Serving is limited to the formats the admin writes (webp) plus what the
// pre-webp uploads left behind. No SVG: it renders as a document on our own
// origin.
const CONTENT_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

// Path traversal is already impossible via `..` (rejected below), but the
// allowlist also keeps the handler from reaching anything but the flat
// <kind>/<file> layout the admin writes.
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const segments = (await ctx.params).path;

  if (segments.length !== 2 || !segments.every((s) => SAFE_SEGMENT.test(s))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(segments[1]).toLowerCase()];
  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  let file: Buffer;
  try {
    file = await fs.promises.readFile(path.join(UPLOADS_DIR, segments[0], segments[1]));
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      // The admin ends every uploaded filename with random hex, so a given
      // path never changes content.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
