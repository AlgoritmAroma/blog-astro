import sharp from "sharp";

/**
 * Finding the subject of a cover.
 *
 * Deliberately its own module, free of `server-only`: `saveImage` needs this
 * on the request path and `scripts/backfill-cover-focus.ts` needs the exact
 * same function from a plain node process. Importing it out of `upload.ts`
 * throws — `server-only` resolves to its client entry under tsx and fails
 * with "This module cannot be imported from a Client Component module" — and
 * a second copy of the logic in the script would be a copy that drifts, which
 * is worse: a backfilled cover would frame differently from an uploaded one.
 */

/** Where the subject sits, as percentages of the image's own width and
 * height. Fed straight to CSS `object-position`, which is what turns a stored
 * image of any proportion into a well-framed 3:2 cover. */
export type Focus = { x: number; y: number };

/** Dead centre — what a cover gets when nothing better is known. */
export const CENTRE_FOCUS: Focus = { x: 50, y: 50 };

/** The frame the answer will be judged in — the blog's `.cover-frame`. */
const FRAME_RATIO = 1.5;

/** Small enough to be cheap, big enough that the region ranking still has
 * detail to rank. The result is proportions, so the size cancels out. */
const PROBE_WIDTH = 500;

/**
 * Asks sharp's `attention` strategy where it would crop, and returns the
 * centre of the region it chose as percentages of the image.
 *
 * The probe target has to differ in aspect from the source or there is no
 * crop for the strategy to make; 3:2 is used because that is the frame the
 * answer will be judged in. Failure is not interesting enough to interrupt an
 * upload over — a cover with a centred focus is exactly what every cover had
 * before this existed — so anything thrown here becomes the centre.
 *
 * The answer comes from `cropOffsetLeft`/`cropOffsetTop` and *not* from the
 * `attentionX`/`attentionY` that sharp reports alongside them, which look like
 * the obvious choice and are a trap: their coordinate space depends on the
 * input format. The same image probed as PNG reports (234, 363) and as WebP
 * (615, 955) — formats with shrink-on-load decode at a different scale, and
 * the attention coordinates come back in whatever space that left. Covers are
 * stored as WebP, so reading those directly put the focus of a tall photo at
 * (0, 0) — pinned to the top-left corner, worse than the centre it replaced.
 * The crop offsets are in the resized image's own space for every format, and
 * that space is computable: scale to cover, then crop.
 */
export async function detectFocus(image: Buffer, animated: boolean): Promise<Focus> {
  // sharp rejects a strategy on multi-page input with "Resize strategy is not
  // supported for multi-page images", so an animated cover keeps the centre.
  if (animated) return CENTRE_FOCUS;

  try {
    const probeHeight = Math.round(PROBE_WIDTH / FRAME_RATIO);
    const { info } = await sharp(image)
      .resize({
        width: PROBE_WIDTH,
        height: probeHeight,
        fit: "cover",
        position: sharp.strategy.attention,
      })
      .toBuffer({ resolveWithObject: true });

    const meta = await sharp(image).metadata();
    if (!meta.width || !meta.height) return CENTRE_FOCUS;

    const scale = Math.max(PROBE_WIDTH / meta.width, probeHeight / meta.height);
    const resized = { width: meta.width * scale, height: meta.height * scale };
    if (resized.width === 0 || resized.height === 0) return CENTRE_FOCUS;

    // The offsets are negative — how far the kept band was pushed up and left
    // — so negating one gives where the band starts, and half the probe puts
    // us at its middle. The axis that wasn't cropped has an offset of 0 and a
    // band as long as the image, which lands this on 50% by itself.
    const centre = {
      x: -(info.cropOffsetLeft ?? 0) + PROBE_WIDTH / 2,
      y: -(info.cropOffsetTop ?? 0) + probeHeight / 2,
    };

    const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
    return {
      x: clamp((centre.x / resized.width) * 100),
      y: clamp((centre.y / resized.height) * 100),
    };
  } catch {
    return CENTRE_FOCUS;
  }
}
