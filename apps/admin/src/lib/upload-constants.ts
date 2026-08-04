// Client-safe half of lib/upload.ts. That module pulls in sharp/fs and is
// marked `server-only`, so the handful of values the browser also needs (the
// file picker's accept list, the size ceiling, the human-readable format list
// shown in the UI) live here instead.

/** 20 MB. Uploads go through a Route Handler, not a Server Action, so
 * next.config's `serverActions.bodySizeLimit` doesn't apply — this is the
 * only ceiling, and it's well above any photo an editor would realistically
 * pick. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** What sharp can actually decode. Everything is re-encoded to webp on the
 * way in, so this is the answer to "какие форматы поддерживаются?". */
export const ACCEPTED_FORMATS = ["JPEG", "PNG", "WebP", "GIF", "AVIF", "TIFF", "SVG"] as const;

export const ACCEPT_ATTRIBUTE =
  "image/jpeg,image/png,image/webp,image/gif,image/avif,image/tiff,image/svg+xml";
