// Article block model — the "конструктор статьи" data format.
//
// Mirrored verbatim in apps/blog/src/lib/blocks.ts (same convention as
// lib/blog.ts: the two apps are separate deploys with separate node_modules,
// so shared pure modules are duplicated rather than turned into a workspace
// package). Keep the two copies in sync.
//
// Client-safe: no fs/pg/sharp imports, so the admin's block editor can import
// the types and the sanitizer from the browser bundle too.

export type Align = "left" | "center" | "right";

export type HeadingBlock = { type: "heading"; level: 2 | 3; text: string; align: Align };
export type ParagraphBlock = { type: "paragraph"; html: string; align: Align };
export type ListBlock = { type: "list"; ordered: boolean; items: string[] };
export type ImageBlock = {
  type: "image";
  src: string;
  alt: string;
  caption: string;
  /** Intrinsic size of the stored webp, captured at upload time so the blog
   * can reserve the right space and avoid a layout shift while it loads. */
  width: number;
  height: number;
};
export type QuoteBlock = { type: "quote"; html: string };
export type FaqBlock = { type: "faq"; items: { q: string; a: string }[] };

export type Block = HeadingBlock | ParagraphBlock | ListBlock | ImageBlock | QuoteBlock | FaqBlock;

export const BLOCK_LIMIT = 300;
const TEXT_LIMIT = 20_000;
const SHORT_TEXT_LIMIT = 500;
const LIST_ITEM_LIMIT = 200;
const FAQ_ITEM_LIMIT = 100;

/** Pastel page backgrounds an editor can pick per article. All are light
 * enough for the site's --brown body text; the first one is the site default
 * (--beige-bg), so an article that never touches this setting looks exactly
 * like it does today. */
export const PAGE_BACKGROUNDS = [
  { value: "#fbf2e1", label: "Бежевый (по умолчанию)" },
  { value: "#f6efe6", label: "Кремовый" },
  { value: "#f0e4cf", label: "Песочный" },
  { value: "#f7ded2", label: "Персиковый" },
  { value: "#f4dfe4", label: "Пудровый" },
  { value: "#e2dced", label: "Лавандовый" },
  { value: "#d5e2ee", label: "Небесный" },
  { value: "#c6cbd3", label: "Морская дымка" },
  { value: "#cdd2cd", label: "Шалфей" },
  { value: "#d7e6dc", label: "Мятный" },
] as const;

export const DEFAULT_BACKGROUND = PAGE_BACKGROUNDS[0].value;

export function isPageBackground(value: string): boolean {
  return PAGE_BACKGROUNDS.some((bg) => bg.value === value);
}

// ---------- inline HTML sanitizer ----------
//
// Paragraph/list/FAQ text is authored in a contentEditable, so it arrives as
// browser-produced HTML from a client that we must treat as untrusted (the
// admin session is the only gate, and this content is rendered with
// dangerouslySetInnerHTML on the *public* blog — a stored-XSS sink).
//
// The approach: never let a byte of caller-supplied markup reach the output.
// Every tag is re-emitted from a fixed template of ours, every run of text
// between tags is HTML-escaped, and unbalanced tags are repaired. The only
// caller-derived attribute value anywhere is an <a href>, and it must pass a
// protocol allowlist first (so `javascript:`/`data:` can't survive).

const TAG_RE = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;

/** Browser-produced synonyms collapse onto one canonical tag each. */
const TAG_ALIASES: Record<string, string> = {
  b: "strong",
  strong: "strong",
  i: "em",
  em: "em",
  u: "u",
  s: "s",
  strike: "s",
  del: "s",
  a: "a",
  br: "br",
};

const VOID_TAGS = new Set(["br"]);

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

const ENTITY_AHEAD = /^&(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/;

/**
 * Escapes a run of text that is *already* HTML-encoded (which is what a
 * contentEditable's innerHTML hands us), leaving well-formed entities intact.
 *
 * A plain escape would double-encode on every round trip: text containing
 * `<` is stored as `&lt;`, comes back out of the editor as `&lt;`, and would
 * be re-escaped to `&amp;lt;` — so the character would visibly rot a little
 * more each time the article was edited. Entities are inert when rendered,
 * so keeping them is safe: `&lt;script&gt;` still displays as text.
 */
function escapeText(input: string): string {
  return input.replace(/[&<>"']/g, (ch, offset: number, whole: string) => {
    if (ch === "&" && ENTITY_AHEAD.test(whole.slice(offset))) return "&";
    return ESCAPE_MAP[ch];
  });
}

/** Only the entities a browser's contentEditable actually emits — enough to
 * read an href back out of raw markup before re-escaping it ourselves. */
function decodeBasicEntities(input: string): string {
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function safeHref(attrs: string): string | null {
  const match = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  if (!match) return null;

  const raw = decodeBasicEntities(match[1] ?? match[2] ?? match[3] ?? "").trim();
  // Embedded control characters/whitespace are how `java\tscript:` style
  // protocol bypasses are built, and a real URL never needs them.
  const href = raw.replace(/[\u0000-\u0020\u007f]/g, "");
  if (!href) return null;
  if (!/^(https?:\/\/|mailto:|\/|#)/i.test(href)) return null;
  return href;
}

/**
 * Reduces arbitrary markup to a small inline subset: strong, em, u, s, br and
 * http(s)/mailto/relative links. Everything else is dropped, tag structure is
 * rebalanced, and all text is escaped.
 *
 * MUST be applied server-side before anything is written to the DB — the
 * client-side call in the editor is only for preview fidelity.
 */
export function sanitizeInlineHtml(input: string): string {
  const source = input.slice(0, TEXT_LIMIT);
  const out: string[] = [];
  const open: string[] = [];
  let cursor = 0;

  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_RE.exec(source)) !== null) {
    out.push(escapeText(source.slice(cursor, match.index)));
    cursor = match.index + match[0].length;

    const tag = TAG_ALIASES[match[1].toLowerCase()];
    // Unknown tag: drop the tag itself but keep whatever text it wrapped.
    if (!tag) continue;

    const isClosing = match[0].startsWith("</");

    if (VOID_TAGS.has(tag)) {
      if (!isClosing) out.push("<br />");
      continue;
    }

    if (isClosing) {
      const depth = open.lastIndexOf(tag);
      // A closer with no matching opener is noise — drop it rather than
      // letting it escape into the surrounding document.
      if (depth === -1) continue;
      // Close everything nested inside it too, so the output stays balanced
      // even when the input interleaves tags (<strong><em></strong></em>).
      for (let i = open.length - 1; i >= depth; i--) out.push(`</${open[i]}>`);
      open.splice(depth, 1);
      // Re-open the tags that were only closed to keep nesting well-formed.
      for (let i = depth; i < open.length; i++) out.push(`<${open[i]}>`);
      continue;
    }

    if (tag === "a") {
      const href = safeHref(match[2]);
      // A link we can't vouch for degrades to its text, not to a dropped
      // sentence.
      if (!href) continue;
      out.push(`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`);
      open.push("a");
      continue;
    }

    out.push(`<${tag}>`);
    open.push(tag);
  }

  out.push(escapeText(source.slice(cursor)));
  for (let i = open.length - 1; i >= 0; i--) out.push(`</${open[i]}>`);

  return out.join("").trim();
}

/** Inline HTML → plain text. Used for headings (which stay unformatted), for
 * reading-time estimation and for the plain-text mirror kept in posts.content. */
export function stripInlineHtml(input: string): string {
  return decodeBasicEntities(input.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function clampText(value: unknown, limit: number): string {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

/** Falls back to a 3:2 placeholder for images stored before dimensions were
 * recorded — the CSS scales to the real ratio once the file loads. */
function parseDimension(value: unknown, fallback = 1200): number {
  const n = typeof value === "number" ? Math.round(value) : Number.NaN;
  return Number.isFinite(n) && n > 0 && n <= 20000 ? n : fallback;
}

function parseAlign(value: unknown): Align {
  return value === "center" || value === "right" ? value : "left";
}

/** In-article images are always files we wrote ourselves under
 * public/uploads — anything else in this field is someone hand-editing the
 * payload, so it's rejected rather than rendered. */
export function isUploadPath(value: string): boolean {
  return /^\/uploads\/[a-z]+\/[A-Za-z0-9._-]+$/.test(value) && !value.includes("..");
}

/** Covers additionally allow /images/… — that's where the five articles
 * migrated from markdown keep theirs. Without this, opening one of them in
 * the editor and pressing Save would be rejected over a cover the editor
 * never touched. */
export function isCoverPath(value: string): boolean {
  if (value.includes("..")) return false;
  return isUploadPath(value) || /^\/images\/[A-Za-z0-9._-]+$/.test(value);
}

function parseBlock(raw: unknown): Block | null {
  if (typeof raw !== "object" || raw === null) return null;
  const input = raw as Record<string, unknown>;

  switch (input.type) {
    case "heading": {
      const text = stripInlineHtml(clampText(input.text, SHORT_TEXT_LIMIT));
      if (!text) return null;
      return {
        type: "heading",
        level: input.level === 3 ? 3 : 2,
        text,
        align: parseAlign(input.align),
      };
    }

    case "paragraph": {
      const html = sanitizeInlineHtml(clampText(input.html, TEXT_LIMIT));
      if (!stripInlineHtml(html)) return null;
      return { type: "paragraph", html, align: parseAlign(input.align) };
    }

    case "list": {
      const rawItems = Array.isArray(input.items) ? input.items.slice(0, LIST_ITEM_LIMIT) : [];
      const items = rawItems
        .map((item) => sanitizeInlineHtml(clampText(item, SHORT_TEXT_LIMIT)))
        .filter((item) => stripInlineHtml(item).length > 0);
      if (items.length === 0) return null;
      return { type: "list", ordered: input.ordered === true, items };
    }

    case "image": {
      const src = clampText(input.src, SHORT_TEXT_LIMIT);
      if (!isUploadPath(src)) return null;
      return {
        type: "image",
        src,
        alt: stripInlineHtml(clampText(input.alt, SHORT_TEXT_LIMIT)),
        caption: stripInlineHtml(clampText(input.caption, SHORT_TEXT_LIMIT)),
        width: parseDimension(input.width),
        height: parseDimension(input.height),
      };
    }

    case "quote": {
      const html = sanitizeInlineHtml(clampText(input.html, TEXT_LIMIT));
      if (!stripInlineHtml(html)) return null;
      return { type: "quote", html };
    }

    case "faq": {
      const rawItems = Array.isArray(input.items) ? input.items.slice(0, FAQ_ITEM_LIMIT) : [];
      const items = rawItems
        .map((item) => {
          if (typeof item !== "object" || item === null) return null;
          const entry = item as Record<string, unknown>;
          const q = stripInlineHtml(clampText(entry.q, SHORT_TEXT_LIMIT));
          const a = sanitizeInlineHtml(clampText(entry.a, TEXT_LIMIT));
          if (!q || !stripInlineHtml(a)) return null;
          return { q, a };
        })
        .filter((item): item is { q: string; a: string } => item !== null);
      if (items.length === 0) return null;
      return { type: "faq", items };
    }

    default:
      return null;
  }
}

/** Validates + sanitizes a blocks payload of unknown provenance. Invalid or
 * empty blocks are dropped rather than failing the whole save — a stray empty
 * paragraph shouldn't cost an editor their article. */
export function parseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, BLOCK_LIMIT)
    .map(parseBlock)
    .filter((block): block is Block => block !== null);
}

export function parseBlocksJson(json: string): Block[] {
  try {
    return parseBlocks(JSON.parse(json));
  } catch {
    return [];
  }
}

/** Flattened article text. Stored alongside the blocks in posts.content so
 * reading-time, future search and the pre-constructor markdown fallback all
 * keep working off a single column. */
export function blocksToPlainText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        parts.push(block.text);
        break;
      case "paragraph":
      case "quote":
        parts.push(stripInlineHtml(block.html));
        break;
      case "list":
        parts.push(block.items.map(stripInlineHtml).join(" "));
        break;
      case "image":
        if (block.caption) parts.push(block.caption);
        break;
      case "faq":
        parts.push(block.items.map((item) => `${item.q} ${stripInlineHtml(item.a)}`).join(" "));
        break;
    }
  }
  return parts.filter(Boolean).join("\n\n");
}

// ---------- markdown → blocks ----------

/** Inline markdown (bold/italic/link/code) → the inline HTML subset. Output
 * still goes through sanitizeInlineHtml, so a malformed pattern can only
 * produce inert text. */
function inlineMarkdownToHtml(input: string): string {
  return input
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, '<a href="$2">$1</a>')
    .replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>")
    .replace(/(^|[^*\w])\*(?=\S)([^*]*?\S)\*/g, "$1<em>$2</em>")
    .replace(/(^|[^_\w])_(?=\S)([^_]*?\S)_/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "$1");
}

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^\s*[-*+]\s+(.*)$/;
const ORDERED_RE = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE_RE = /^\s*>\s?(.*)$/;
const IMAGE_RE = /^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/;

/**
 * Converts a legacy markdown article body into constructor blocks.
 *
 * Posts written before the block editor existed only have markdown in
 * `posts.content`; opening one in the constructor runs it through here so the
 * editor shows real blocks instead of an empty canvas. Covers everything the
 * migrated articles actually use: ##/### headings, bullet and numbered lists,
 * blockquotes, images, bold, italic and links.
 */
export function markdownToBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const raw: unknown[] = [];

  let paragraph: string[] = [];
  let quote: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    raw.push({ type: "paragraph", html: inlineMarkdownToHtml(paragraph.join(" ")), align: "left" });
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    raw.push({ type: "quote", html: inlineMarkdownToHtml(quote.join(" ")) });
    quote = [];
  };
  const flushList = () => {
    if (!list) return;
    raw.push({ type: "list", ordered: list.ordered, items: list.items.map(inlineMarkdownToHtml) });
    list = null;
  };
  const flushAll = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushAll();
      continue;
    }

    const image = IMAGE_RE.exec(line);
    if (image) {
      flushAll();
      raw.push({ type: "image", src: image[2], alt: image[1] ?? "", caption: image[3] ?? "" });
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      flushAll();
      // The article's own H1 is the post title, so a top-level markdown
      // heading in the body starts at H2 here.
      raw.push({
        type: "heading",
        level: heading[1].length >= 3 ? 3 : 2,
        text: inlineMarkdownToHtml(heading[2]),
        align: "left",
      });
      continue;
    }

    const quoted = QUOTE_RE.exec(line);
    if (quoted) {
      flushParagraph();
      flushList();
      quote.push(quoted[1]);
      continue;
    }

    const bullet = BULLET_RE.exec(line);
    const ordered = bullet ? null : ORDERED_RE.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      flushQuote();
      const isOrdered = ordered !== null;
      if (list && list.ordered !== isOrdered) flushList();
      list ??= { ordered: isOrdered, items: [] };
      list.items.push((bullet?.[1] ?? ordered?.[1]) as string);
      continue;
    }

    // A plain line directly under a list item is that item's continuation.
    if (list) {
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    if (quote.length > 0) {
      quote[quote.length - 1] += ` ${line.trim()}`;
      continue;
    }
    paragraph.push(line.trim());
  }

  flushAll();
  return parseBlocks(raw);
}
