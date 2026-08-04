"use client";

import { useEffect, useRef } from "react";
import { sanitizeInlineHtml } from "@/lib/blocks";

/**
 * A minimal rich-text field: select text, hit Ж/К, get bold/italic — which is
 * what the editor asked for and all the article format supports.
 *
 * It is a contentEditable rather than a textarea because the formatting is
 * selection-based. `document.execCommand` is formally deprecated but is still
 * the only zero-dependency way to apply formatting to a selection, and every
 * browser implements it; the alternative was pulling in a full ProseMirror
 * stack for four buttons.
 *
 * Whatever the browser produces is untrusted markup — it gets sanitized here
 * for display and, non-negotiably, again on the server before it is stored.
 */
export default function RichText({
  value,
  onChange,
  onEnter,
  placeholder,
  singleLine = false,
  minHeight = 80,
  label,
  focusSignal,
}: {
  value: string;
  onChange: (html: string) => void;
  onEnter?: () => void;
  placeholder?: string;
  singleLine?: boolean;
  minHeight?: number;
  label?: string;
  /** Bump this number to move the caret into this field — used when Enter in
   * a list creates the next item. */
  focusSignal?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Tracks the HTML we last handed to the parent. Writing `value` back into
  // the DOM on every render would reset the caret to the start of the field
  // on every keystroke, so the DOM is only overwritten when `value` changed
  // for some reason other than the user typing (draft restore, undo, reset).
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || value === lastEmitted.current) return;
    el.innerHTML = value;
    lastEmitted.current = value;
  }, [value]);

  // Declared after the value sync above so the caret lands in a field whose
  // content is already in the DOM.
  useEffect(() => {
    if (focusSignal === undefined) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [focusSignal]);

  function emit() {
    const html = ref.current?.innerHTML ?? "";
    lastEmitted.current = html;
    onChange(html);
  }

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  }

  function addLink() {
    const url = window.prompt("Адрес ссылки", "https://");
    if (!url) return;
    exec("createLink", url);
  }

  function handleBlur() {
    const el = ref.current;
    if (!el) return;
    // Normalise on blur rather than on input: pasted Word/Docs markup and
    // stray tags collapse to the supported subset, but the caret is only
    // disturbed once the field is no longer being typed in.
    const clean = sanitizeInlineHtml(el.innerHTML);
    if (clean !== el.innerHTML) {
      el.innerHTML = clean;
    }
    lastEmitted.current = clean;
    onChange(clean);
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    // Paste as plain text — otherwise a paste from Word arrives as a wall of
    // <span style> that the sanitizer would strip anyway, losing the text's
    // line structure in the process.
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, singleLine ? text.replace(/\s*\n\s*/g, " ") : text);
    emit();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") return;
    if (singleLine) {
      event.preventDefault();
      onEnter?.();
      return;
    }
    if (onEnter && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      onEnter();
    }
  }

  return (
    <div className="rt">
      <div className="rt-toolbar">
        {/* preventDefault on mousedown keeps the text selection alive — without
            it, clicking the button blurs the field and there is nothing to
            format by the time the click lands. */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} title="Жирный (Ctrl+B)">
          <b>Ж</b>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} title="Курсив (Ctrl+I)">
          <i>К</i>
        </button>
        {/* Text labels, not icons — the admin has no icon font and emoji
            render as tofu on some machines. */}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={addLink} title="Вставить ссылку">
          Ссылка
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("removeFormat")}
          title="Убрать форматирование"
        >
          Без формата
        </button>
      </div>
      <div
        ref={ref}
        className="rt-input"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label={label}
        aria-multiline={!singleLine}
        data-placeholder={placeholder}
        style={{ minHeight: singleLine ? undefined : minHeight }}
        onInput={emit}
        onBlur={handleBlur}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
