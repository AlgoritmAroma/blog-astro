"use client";

import { useState } from "react";
import RichText from "./RichText";
import ImageField from "./ImageField";
import type { Align, Block } from "@/lib/blocks";

/** Blocks carry a stable client-side id purely so React keys survive
 * reordering — it is stripped before the array is submitted. */
export type EditorBlock = Block & { _id: string };

let idCounter = 0;
function nextId(): string {
  return `b${idCounter++}`;
}

export function withIds(blocks: Block[]): EditorBlock[] {
  return blocks.map((block) => ({ ...block, _id: nextId() }));
}

export function stripIds(blocks: EditorBlock[]): Block[] {
  return blocks.map((block) => {
    const copy: Partial<EditorBlock> = { ...block };
    delete copy._id;
    return copy as Block;
  });
}

type BlockKind = Block["type"];

const BLOCK_KINDS: { type: BlockKind; label: string; hint: string }[] = [
  { type: "heading", label: "Подглава", hint: "H2 / H3" },
  { type: "paragraph", label: "Текст", hint: "абзац" },
  { type: "list", label: "Список", hint: "точки или номера" },
  { type: "image", label: "Картинка", hint: "с ALT" },
  { type: "quote", label: "Цитата", hint: "выделенный блок" },
  { type: "faq", label: "FAQ", hint: "вопрос-ответ" },
];

function createBlock(type: BlockKind): EditorBlock {
  const _id = nextId();
  switch (type) {
    case "heading":
      return { _id, type: "heading", level: 2, text: "", align: "left" };
    case "paragraph":
      return { _id, type: "paragraph", html: "", align: "left" };
    case "list":
      return { _id, type: "list", ordered: false, items: [""] };
    case "image":
      return { _id, type: "image", src: "", alt: "", caption: "", width: 0, height: 0 };
    case "quote":
      return { _id, type: "quote", html: "" };
    case "faq":
      return { _id, type: "faq", items: [{ q: "", a: "" }] };
  }
}

const ALIGNS: { value: Align; label: string; title: string }[] = [
  { value: "left", label: "⇤", title: "По левому краю" },
  { value: "center", label: "↔", title: "По центру" },
  { value: "right", label: "⇥", title: "По правому краю" },
];

function AlignPicker({ value, onChange }: { value: Align; onChange: (align: Align) => void }) {
  return (
    <div className="admin-segmented" role="group" aria-label="Выравнивание">
      {ALIGNS.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.title}
          className={value === option.value ? "is-active" : undefined}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** The "+" divider between blocks. Kept collapsed so a long article isn't a
 * wall of buttons, and available at every position so a block can be inserted
 * in the middle instead of appended and walked up. */
function InsertBar({ onInsert, always }: { onInsert: (type: BlockKind) => void; always?: boolean }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className={`admin-insert-bar${always ? " is-always" : ""}`}>
        <button type="button" className="admin-insert-toggle" onClick={() => setOpen(true)}>
          + Добавить блок
        </button>
      </div>
    );
  }

  return (
    <div className="admin-insert-bar is-open">
      {BLOCK_KINDS.map((kind) => (
        <button
          key={kind.type}
          type="button"
          className="admin-btn-ghost admin-btn-small"
          onClick={() => {
            onInsert(kind.type);
            setOpen(false);
          }}
        >
          {kind.label}
          <span className="admin-hint-inline">{kind.hint}</span>
        </button>
      ))}
      <button type="button" className="admin-insert-toggle" onClick={() => setOpen(false)}>
        Отмена
      </button>
    </div>
  );
}

export default function BlockEditor({
  blocks,
  onChange,
  slugHint,
}: {
  blocks: EditorBlock[];
  onChange: (blocks: EditorBlock[]) => void;
  slugHint: string;
}) {
  // Which list item should take the caret next, and a nonce so asking twice
  // for the same field still fires.
  const [focus, setFocus] = useState<{ block: number; item: number; nonce: number } | null>(null);

  function insertAt(index: number, type: BlockKind) {
    const next = blocks.slice();
    next.splice(index, 0, createBlock(type));
    onChange(next);
  }

  function patch(index: number, changes: Partial<Block>) {
    onChange(
      blocks.map((block, i) => (i === index ? ({ ...block, ...changes } as EditorBlock) : block))
    );
  }

  function remove(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= blocks.length) return;
    const next = blocks.slice();
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="admin-blocks">
      <InsertBar onInsert={(type) => insertAt(0, type)} always={blocks.length === 0} />

      {blocks.map((block, index) => (
        <div key={block._id}>
          <div className="admin-block">
            <div className="admin-block-head">
              <span className="admin-block-type">
                {BLOCK_KINDS.find((kind) => kind.type === block.type)?.label ?? block.type}
              </span>
              <div className="admin-inline-actions">
                <button
                  type="button"
                  className="admin-btn-ghost admin-btn-small"
                  title="Выше"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="admin-btn-ghost admin-btn-small"
                  title="Ниже"
                  disabled={index === blocks.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="admin-btn-ghost admin-btn-small admin-btn-remove"
                  title="Удалить блок"
                  onClick={() => remove(index)}
                >
                  ✕
                </button>
              </div>
            </div>

            {block.type === "heading" && (
              <>
                <div className="admin-block-controls">
                  <select
                    className="admin-select admin-select-small"
                    value={block.level}
                    onChange={(e) => patch(index, { level: Number(e.target.value) === 3 ? 3 : 2 })}
                  >
                    <option value={2}>H2</option>
                    <option value={3}>H3</option>
                  </select>
                  <AlignPicker value={block.align} onChange={(align) => patch(index, { align })} />
                </div>
                <input
                  type="text"
                  className="admin-input"
                  placeholder="Текст подглавы"
                  value={block.text}
                  onChange={(e) => patch(index, { text: e.target.value })}
                />
              </>
            )}

            {block.type === "paragraph" && (
              <>
                <div className="admin-block-controls">
                  <AlignPicker value={block.align} onChange={(align) => patch(index, { align })} />
                </div>
                <RichText
                  label="Текст абзаца"
                  placeholder="Текст абзаца. Выделите фрагмент и нажмите Ж, чтобы сделать его жирным."
                  value={block.html}
                  onChange={(html) => patch(index, { html })}
                />
              </>
            )}

            {block.type === "quote" && (
              <RichText
                label="Цитата"
                placeholder="Текст цитаты"
                value={block.html}
                onChange={(html) => patch(index, { html })}
              />
            )}

            {block.type === "list" && (
              <>
                <div className="admin-block-controls">
                  <div className="admin-segmented" role="group" aria-label="Тип списка">
                    <button
                      type="button"
                      className={!block.ordered ? "is-active" : undefined}
                      onClick={() => patch(index, { ordered: false })}
                    >
                      • Точки
                    </button>
                    <button
                      type="button"
                      className={block.ordered ? "is-active" : undefined}
                      onClick={() => patch(index, { ordered: true })}
                    >
                      1. Номера
                    </button>
                  </div>
                </div>
                {block.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="admin-list-row">
                    <span className="admin-list-marker">{block.ordered ? `${itemIndex + 1}.` : "•"}</span>
                    <div style={{ flex: 1 }}>
                      <RichText
                        singleLine
                        label={`Пункт ${itemIndex + 1}`}
                        placeholder="Текст пункта"
                        focusSignal={
                          focus && focus.block === index && focus.item === itemIndex
                            ? focus.nonce
                            : undefined
                        }
                        value={item}
                        onChange={(html) => {
                          const items = block.items.slice();
                          items[itemIndex] = html;
                          patch(index, { items });
                        }}
                        // Enter at the end of an item starts the next one,
                        // the way a list behaves in any word processor.
                        onEnter={() => {
                          const items = block.items.slice();
                          items.splice(itemIndex + 1, 0, "");
                          patch(index, { items });
                          // Without this the caret stays in the item that was
                          // just split and the new one silently stays empty.
                          setFocus((prev) => ({
                            block: index,
                            item: itemIndex + 1,
                            nonce: (prev?.nonce ?? 0) + 1,
                          }));
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="admin-btn-ghost admin-btn-small admin-btn-remove"
                      title="Удалить пункт"
                      disabled={block.items.length === 1}
                      onClick={() => patch(index, { items: block.items.filter((_, i) => i !== itemIndex) })}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn-ghost admin-btn-small"
                  onClick={() => patch(index, { items: [...block.items, ""] })}
                >
                  + Пункт
                </button>
              </>
            )}

            {block.type === "image" && (
              <>
                <ImageField
                  kind="content"
                  slugHint={slugHint}
                  label="Изображение в статье"
                  value={block.src}
                  onChange={({ src, width, height }) => patch(index, { src, width, height })}
                />
                <div className="admin-form-field">
                  <label>ALT — описание для поисковиков и незрячих читателей</label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Например: схема натальной карты с 12 домами"
                    value={block.alt}
                    onChange={(e) => patch(index, { alt: e.target.value })}
                  />
                </div>
                <div className="admin-form-field">
                  <label>Подпись под картинкой (необязательно)</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={block.caption}
                    onChange={(e) => patch(index, { caption: e.target.value })}
                  />
                </div>
              </>
            )}

            {block.type === "faq" && (
              <>
                {block.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="admin-faq-row">
                    <div className="admin-form-field">
                      <label>Вопрос {itemIndex + 1}</label>
                      <input
                        type="text"
                        className="admin-input"
                        placeholder="Что показывает натальная карта?"
                        value={item.q}
                        onChange={(e) => {
                          const items = block.items.slice();
                          items[itemIndex] = { ...item, q: e.target.value };
                          patch(index, { items });
                        }}
                      />
                    </div>
                    <div className="admin-form-field">
                      <label>Ответ {itemIndex + 1}</label>
                      <RichText
                        label={`Ответ ${itemIndex + 1}`}
                        placeholder="Короткий ответ"
                        minHeight={60}
                        value={item.a}
                        onChange={(a) => {
                          const items = block.items.slice();
                          items[itemIndex] = { ...item, a };
                          patch(index, { items });
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="admin-btn-ghost admin-btn-small admin-btn-remove"
                      disabled={block.items.length === 1}
                      onClick={() => patch(index, { items: block.items.filter((_, i) => i !== itemIndex) })}
                    >
                      Удалить вопрос
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn-ghost admin-btn-small"
                  onClick={() => patch(index, { items: [...block.items, { q: "", a: "" }] })}
                >
                  + Вопрос
                </button>
              </>
            )}
          </div>

          <InsertBar onInsert={(type) => insertAt(index + 1, type)} />
        </div>
      ))}
    </div>
  );
}
