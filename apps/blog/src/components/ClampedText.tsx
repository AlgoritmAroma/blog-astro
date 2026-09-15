"use client";

import { useLayoutEffect, useRef } from "react";

/** What replaces the cut-off part. The editor asked for dots a reader can't
 * miss, not the single "…" a CSS line-clamp would draw. */
const MORE = ".......";

/**
 * Text cut to whatever box its CSS gives it, ending in "......." when it had
 * to be cut.
 *
 * CSS can clamp lines but can't choose the ellipsis, so the fitting happens
 * here: the element's own height is set by its stylesheet (a max-height, or a
 * flex share of a fixed-height card) with overflow hidden, and this finds the
 * most whole words that fit alongside the dots. The server renders the full
 * text, so without JavaScript the box simply hides the overflow.
 *
 * The text is written to the DOM node directly while measuring. React only
 * touches that node again when `text` changes, and that re-runs the fit.
 */
export default function ClampedText({
  as: Tag = "p",
  text,
  className,
}: {
  as?: "p" | "h3";
  text: string;
  className?: string;
}) {
  // Either tag may be rendered, so the ref has to satisfy both element types.
  const ref = useRef<HTMLParagraphElement & HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const overflows = () => el.scrollHeight > el.clientHeight + 1;

    const words = text.split(/\s+/).filter(Boolean);

    /** The first `count` words and the dots, or the whole text for null. The
     * dots get their own element: in the headline face they shrink to a
     * barely visible dotted line, so the stylesheet sets them in the body
     * face. */
    function render(count: number | null) {
      if (!el) return;
      if (count === null) {
        el.textContent = text;
        return;
      }
      // Trailing punctuation would run into the dots ("слово,.......").
      el.textContent = words.slice(0, count).join(" ").replace(/[\s.,;:!?…—–-]+$/, "");
      const more = document.createElement("span");
      more.className = "clamped-text__more";
      more.textContent = MORE;
      el.append(more);
    }

    function fit() {
      render(null);
      if (!overflows()) return;

      // Largest word count that still fits; 0 leaves just the dots.
      let lo = 0;
      let hi = words.length - 1;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        render(mid);
        if (overflows()) hi = mid - 1;
        else lo = mid;
      }
      render(lo);
    }

    fit();

    // A narrower card re-wraps the lines, and the web fonts arrive after first
    // paint with different metrics from the fallback the first fit used.
    // Refitting doesn't resize the box (its height comes from the card), so
    // this can't feed back into itself.
    let lastWidth = el.clientWidth;
    let lastHeight = el.clientHeight;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === lastWidth && el.clientHeight === lastHeight) return;
      lastWidth = el.clientWidth;
      lastHeight = el.clientHeight;
      fit();
    });
    observer.observe(el);
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [text]);

  return (
    <Tag ref={ref} className={className}>
      {text}
    </Tag>
  );
}
