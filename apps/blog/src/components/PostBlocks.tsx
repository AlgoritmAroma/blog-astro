import Image from "next/image";
import type { Block, FaqBlock, TableBlock } from "@/lib/blocks";

/**
 * Renders an article built in the admin's block constructor.
 *
 * Inline HTML (bold/italic/links inside paragraphs, list items, table cells
 * and FAQ answers) is injected with dangerouslySetInnerHTML — it is safe here only
 * because every one of those strings went through `sanitizeInlineHtml` on the
 * server before it was stored, and again through `parseBlocks` when it was
 * read back. Do not render a block string that hasn't been through both.
 */
export default function PostBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="prose">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading": {
            const Tag = block.level === 3 ? "h3" : "h2";
            return (
              <Tag key={index} style={{ textAlign: block.align }}>
                {block.text}
              </Tag>
            );
          }

          case "paragraph":
            return (
              <p
                key={index}
                style={{ textAlign: block.align }}
                dangerouslySetInnerHTML={{ __html: block.html }}
              />
            );

          case "quote":
            return <blockquote key={index} dangerouslySetInnerHTML={{ __html: block.html }} />;

          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </Tag>
            );
          }

          case "image":
            return (
              <figure key={index} className="prose-figure">
                <Image
                  src={block.src}
                  alt={block.alt}
                  width={block.width}
                  height={block.height}
                  sizes="(max-width: 860px) 100vw, 820px"
                  style={{ width: "100%", height: "auto" }}
                />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );

          case "table":
            return <Table key={index} block={block} />;

          case "faq":
            return <Faq key={index} block={block} />;
        }
      })}
    </div>
  );
}

/** Accordion built on <details> — it works with JavaScript disabled, is
 * keyboard-accessible for free, and Google reads the same Q&A pairs from the
 * FAQPage JSON-LD emitted alongside it. */
function Faq({ block }: { block: FaqBlock }) {
  return (
    <section className="faq">
      <h2 className="faq-title">Частые вопросы</h2>
      {block.items.map((item, index) => (
        <details key={index} className="faq-item">
          <summary>{item.q}</summary>
          <div className="faq-answer" dangerouslySetInnerHTML={{ __html: item.a }} />
        </details>
      ))}
    </section>
  );
}

/** The table scrolls sideways inside its own wrapper, so a wide one never
 * makes the whole page scroll on a phone. The wrapper is focusable and named
 * so keyboard users can scroll it too (WCAG "scrollable region"). */
function Table({ block }: { block: TableBlock }) {
  const [head, body] = block.header ? [block.rows[0], block.rows.slice(1)] : [null, block.rows];
  return (
    <figure className="prose-table">
      <div className="prose-table-scroll" role="region" aria-label={block.caption || "Таблица"} tabIndex={0}>
        <table>
          {head && (
            <thead>
              <tr>
                {head.map((cell, index) => (
                  <th key={index} scope="col" dangerouslySetInnerHTML={{ __html: cell }} />
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, index) => (
                  <td key={index} dangerouslySetInnerHTML={{ __html: cell }} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}
