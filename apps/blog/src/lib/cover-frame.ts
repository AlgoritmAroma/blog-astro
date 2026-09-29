/**
 * What shape to show a cover in.
 *
 * Two places show a cover, and they want opposite things.
 *
 * **In the grid** every card shows its cover in the same 3:2 frame. Letting
 * the frame follow each file's own proportions was tried and taken back out:
 * a 16:9 cover next to a 3:4 one gave a row of cards whose pictures, tags and
 * titles all began at different heights, and the grid stopped reading as a
 * grid. The focus point (`object-position`) decides what survives the crop,
 * and it is computed against 3:2 anyway (`lib/cover-focus.ts`), so the frame
 * and the framing finally agree.
 *
 * **The article hero** is one image on its own page with nothing to line up
 * against, so there it still follows the cover: a cover inside the allowed
 * band is shown whole and nothing is cropped at all. The band exists because
 * a hero still has to leave room for the article — outside it the cover is
 * clamped to the nearest edge and cropped to that.
 */

/** Widest allowed — beyond this a panorama becomes a letterbox strip. */
const MAX_RATIO = 16 / 9;

/** Tallest allowed for the article hero. 2:3 covers a full-frame portrait
 * photograph; past that the hero starts costing the reader real scroll. */
const MIN_RATIO_ARTICLE = 2 / 3;

/** The grid's frame, and what a cover of unknown size gets anywhere. */
export const DEFAULT_RATIO = 3 / 2;

export type CoverSize = { width: number; height: number };

/**
 * Returns a CSS `aspect-ratio` value for the frame.
 *
 * `null`/0 dimensions mean the size was never recorded — every article that
 * predates the column — and those keep 3:2 rather than being guessed at.
 */
export function coverAspectRatio(
  size: CoverSize | null | undefined,
  place: "card" | "article"
): number {
  if (place === "card") return DEFAULT_RATIO;
  if (!size || !size.width || !size.height) return DEFAULT_RATIO;

  const ratio = size.width / size.height;
  if (!Number.isFinite(ratio) || ratio <= 0) return DEFAULT_RATIO;

  return Math.min(MAX_RATIO, Math.max(MIN_RATIO_ARTICLE, ratio));
}
