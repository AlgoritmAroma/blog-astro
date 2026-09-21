"use client";

import { useEffect, useRef, useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { createCategoryAction } from "@/app/(protected)/posts/actions";

/**
 * Rubric picker: a dropdown of every stored rubric as checkboxes, with a field
 * at the bottom for adding a new one. A rubric added here is stored at once —
 * not when the article saves — so it is in the list next time whatever happens
 * to this article.
 */
export default function CategoryPicker({
  id,
  options: initialOptions,
  selected,
  onChange,
}: {
  id: string;
  options: string[];
  selected: string[];
  /** A state setter rather than a plain callback: adding a rubric finishes
   * asynchronously, and must not undo a tick made while it was in flight. */
  onChange: Dispatch<SetStateAction<string[]>>;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [adding, startAdding] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = `${id}-panel`;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // A ticked rubric missing from the list (say, from a restored draft) still
  // has to be visible, or there would be no way to untick it.
  const shown = [...options, ...selected.filter((name) => !options.includes(name))];

  function toggle(name: string) {
    onChange((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  }

  function add() {
    if (!newName.trim()) {
      setError("Введите название категории.");
      return;
    }
    setError("");
    startAdding(async () => {
      try {
        const result = await createCategoryAction(newName);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        // The server may hand back an existing rubric's spelling (matching is
        // case-insensitive), so both lists are checked against what it returned.
        setOptions((prev) => (prev.includes(result.name) ? prev : [...prev, result.name]));
        onChange((prev) => (prev.includes(result.name) ? prev : [...prev, result.name]));
        setNewName("");
      } catch {
        setError("Не удалось сохранить категорию — попробуйте ещё раз.");
      }
    });
  }

  return (
    <div className="admin-category-picker" ref={rootRef}>
      <button
        id={id}
        type="button"
        className="admin-select admin-category-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={selected.length ? undefined : "admin-category-placeholder"}>
          {selected.length ? selected.join(", ") : "Выберите категории"}
        </span>
        <span aria-hidden="true" className="admin-category-chevron">
          ▾
        </span>
      </button>

      {open && (
        <div id={panelId} className="admin-category-panel">
          {shown.length > 0 ? (
            <ul className="admin-category-list">
              {shown.map((name) => (
                <li key={name}>
                  <label className="admin-category-option">
                    <input
                      type="checkbox"
                      checked={selected.includes(name)}
                      onChange={() => toggle(name)}
                    />
                    <span>{name}</span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-hint admin-category-empty">
              Категорий пока нет — создайте первую ниже.
            </p>
          )}

          <div className="admin-category-new">
            <input
              type="text"
              className="admin-input"
              placeholder="Новая категория"
              aria-label="Название новой категории"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the rubric rather than submitting the article.
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
            />
            <button type="button" className="admin-btn" disabled={adding} onClick={add}>
              {adding ? "Сохранение…" : "Добавить"}
            </button>
          </div>
          {error && <p className="admin-error admin-category-error">{error}</p>}
        </div>
      )}
    </div>
  );
}
