/**
 * What shape to show a cover in.
 *
 * The frame used to be a hard `aspect-ratio: 3 / 2`, and everything that
 * wasn't 3:2 lost the difference: a 3:4 portrait lost 51% of its height and a
 * 9:16 phone photo 62%, cut away by `object-fit: cover` in the browser. The
 * focus point decided *which* part survived, which is a different problem
 * from half the picture being gone.
 *
 * So the frame follows the cover instead. Given the file's real proportions,
 * a cover inside the allowed band is shown whole — nothing is cropped at all,
 * and the focus point becomes moot because there is no overflow to position.
 *
 * The band exists because a grid of cards is still a grid: without a floor,
 * one 9:16 upload would tower over the row next to it. Covers outside it are
 * clamped to the nearest edge and cropped to that, which is where the focus
 * point earns its keep.
 */

/** Widest allowed — beyond this a panorama becomes a letterbox slot that
 * leaves the card's text stranded under a strip. */
const MAX_RATIO = 16 / 9;

/** Tallest allowed in the grid. 3:4 is the shape of a phone photo held
 * upright and of most portrait uploads, so the common case lands inside the
 * band and is shown whole. */
const MIN_RATIO_CARD = 3 / 4;

/** The article hero is one image on its own page with nothing to line up
 * against, so it can afford to go taller before it starts costing the reader
 * scroll. 2:3 covers a full-frame portrait photograph. */
const MIN_RATIO_ARTICLE = 2 / 3;

/** What every cover was shown in before this, and what a cover of unknown
 * size still gets. */
export const DEFAULT_RATIO = 3 / 2;

export type CoverSize = { width: number; height: number };

/**
 * Returns a CSS `aspect-ratio` value for the frame.
 *
 * `null`/0 dimensions mean the size was never recorded — every article that
 * predates the column — and those keep the 3:2 they have today rather than
 * being guessed at.
 */
export function coverAspectRatio(
  size: CoverSize | null | undefined,
  place: "card" | "article"
): number {
  if (!size || !size.width || !size.height) return DEFAULT_RATIO;

  const ratio = size.width / size.height;
  if (!Number.isFinite(ratio) || ratio <= 0) return DEFAULT_RATIO;

  const min = place === "article" ? MIN_RATIO_ARTICLE : MIN_RATIO_CARD;
  return Math.min(MAX_RATIO, Math.max(min, ratio));
}
