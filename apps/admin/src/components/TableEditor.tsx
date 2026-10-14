"use client";

import { useState } from "react";
import RichText from "./RichText";
import { TABLE_MAX_COLS, TABLE_MAX_ROWS, type TableBlock } from "@/lib/blocks";

type Cell = { row: number; col: number };

/** The size a fresh table starts at: a header row plus two rows of data. */
export function emptyTableRows(rows = 3, cols = 3): string[][] {
  return Array.from({ length: rows }, () => Array<string>(cols).fill(""));
}

/**
 * Table block editor: a grid of borderless rich-text cells under one shared
 * toolbar. Structure buttons act on the cell that last held the caret (or on
 * the last row/column when nothing has been clicked yet), the way "insert row
 * below" works in a word processor.
 *
 * Cells are the same sanitized inline subset as paragraphs, so the table needs
 * no extra sanitizer surface: the <table>/<tr>/<td> markup is never authored
 * here, only emitted by the blog's renderer from the row/cell arrays.
 */
export default function TableEditor({
  block,
  onChange,
  onRemove,
}: {
  block: TableBlock;
  onChange: (changes: Partial<TableBlock>) => void;
  onRemove: () => void;
}) {
  const { rows, header } = block;
  const cols = rows[0]?.length ?? 0;

  const [active, setActive] = useState<Cell | null>(null);
  const [focus, setFocus] = useState<(Cell & { nonce: number }) | null>(null);

  const targetRow = Math.min(active?.row ?? rows.length - 1, rows.length - 1);
  const targetCol = Math.min(active?.col ?? cols - 1, cols - 1);

  function focusCell(cell: Cell) {
    setActive(cell);
    setFocus((prev) => ({ ...cell, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  function setCell(row: number, col: number, html: string) {
    onChange({
      rows: rows.map((r, ri) => (ri === row ? r.map((c, ci) => (ci === col ? html : c)) : r)),
    });
  }

  function addRow(after = targetRow) {
    if (rows.length >= TABLE_MAX_ROWS) return;
    const next = rows.slice();
    next.splice(after + 1, 0, Array<string>(cols).fill(""));
    onChange({ rows: next });
    focusCell({ row: after + 1, col: Math.max(targetCol, 0) });
  }

  function addCol() {
    if (cols >= TABLE_MAX_COLS) return;
    onChange({
      rows: rows.map((r) => {
        const copy = r.slice();
        copy.splice(targetCol + 1, 0, "");
        return copy;
      }),
    });
    focusCell({ row: Math.max(targetRow, 0), col: targetCol + 1 });
  }

  function removeRow() {
    if (rows.length <= 1) return;
    onChange({ rows: rows.filter((_, i) => i !== targetRow) });
    setActive(null);
  }

  function removeCol() {
    if (cols <= 1) return;
    onChange({ rows: rows.map((r) => r.filter((_, i) => i !== targetCol)) });
    setActive(null);
  }

  /** Formatting goes through execCommand on the focused cell; the cell's own
   * input/blur handlers pick the change up and sanitize it. */
  function format(command: "bold" | "italic") {
    document.execCommand(command);
  }

  function addLink() {
    const selection = window.getSelection();
    const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    const url = window.prompt("Адрес ссылки", "https://");
    if (!url || !range) return;
    // The prompt can take the selection with it — put it back in the cell
    // before applying the link.
    const container = range.startContainer;
    const cell = (container instanceof Element ? container : container.parentElement)?.closest<HTMLElement>(".rt-input");
    cell?.focus();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.execCommand("createLink", false, url);
  }

  const keepSelection = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="admin-table-editor">
      <div className="admin-table-toolbar" role="toolbar" aria-label="Таблица">
        <div className="admin-table-toolbar-group">
          <button type="button" onMouseDown={keepSelection} onClick={() => format("bold")} disabled={!active} title="Жирный (Ctrl+B)">
            <b>Ж</b>
          </button>
          <button type="button" onMouseDown={keepSelection} onClick={() => format("italic")} disabled={!active} title="Курсив (Ctrl+I)">
            <i>К</i>
          </button>
          <button type="button" onMouseDown={keepSelection} onClick={addLink} disabled={!active} title="Вставить ссылку">
            Ссылка
          </button>
        </div>
        <div className="admin-table-toolbar-group">
          <button type="button" onClick={() => addRow()} disabled={rows.length >= TABLE_MAX_ROWS} title="Вставить строку под выбранной">
            + Строка
          </button>
          <button type="button" onClick={addCol} disabled={cols >= TABLE_MAX_COLS} title="Вставить столбец справа от выбранного">
            + Столбец
          </button>
          <button type="button" onClick={removeRow} disabled={rows.length <= 1} title="Удалить выбранную строку">
            − Строка
          </button>
          <button type="button" onClick={removeCol} disabled={cols <= 1} title="Удалить выбранный столбец">
            − Столбец
          </button>
        </div>
        <label className="admin-table-toggle">
          <input type="checkbox" checked={header} onChange={(e) => onChange({ header: e.target.checked })} />
          Первая строка — заголовок
        </label>
        <button type="button" className="admin-table-delete" onClick={onRemove} title="Удалить таблицу целиком">
          Удалить таблицу
        </button>
      </div>

      <div className="admin-table-scroll">
        <table className={`admin-table${header ? " has-header" : ""}`}>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className={active?.row === r ? "is-active-row" : undefined}>
                {row.map((cell, c) => {
                  const Tag = header && r === 0 ? "th" : "td";
                  const isActive = active?.row === r && active?.col === c;
                  return (
                    <Tag
                      key={c}
                      className={[isActive && "is-active", active?.col === c && "is-active-col"].filter(Boolean).join(" ") || undefined}
                    >
                      <RichText
                        bare
                        singleLine
                        label={`Строка ${r + 1}, столбец ${c + 1}`}
                        placeholder={header && r === 0 ? "Заголовок" : ""}
                        value={cell}
                        focusSignal={focus && focus.row === r && focus.col === c ? focus.nonce : undefined}
                        onFocus={() => setActive({ row: r, col: c })}
                        onChange={(html) => setCell(r, c, html)}
                        // Enter goes down a column, adding a row at the bottom
                        // — the fastest way to fill a table from the keyboard.
                        onEnter={() => (r + 1 < rows.length ? focusCell({ row: r + 1, col: c }) : addRow(r))}
                      />
                    </Tag>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="admin-hint admin-table-hint">
        {rows.length} × {cols}. Tab — следующая ячейка, Enter — ячейка ниже. Пустые строки при
        сохранении убираются.
      </p>

      <div className="admin-form-field">
        <label>Подпись под таблицей (необязательно)</label>
        <input
          type="text"
          className="admin-input"
          value={block.caption}
          onChange={(e) => onChange({ caption: e.target.value })}
        />
      </div>
    </div>
  );
}
