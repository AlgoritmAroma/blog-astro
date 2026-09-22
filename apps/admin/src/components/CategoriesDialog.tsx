"use client";

import { useRef } from "react";
import type { CategoryWithUsage } from "@/lib/categories";
import { deleteCategoryAction } from "@/app/(protected)/actions";
import CategoryEditForm from "@/components/CategoryEditForm";
import ConfirmButton from "@/components/ConfirmButton";

/** Russian plural for "статья": 1 статья, 2 статьи, 5 статей. */
function articles(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} статья`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} статьи`;
  return `${n} статей`;
}

function deleteConfirmText(c: CategoryWithUsage): string {
  if (c.postCount === 0) return `Удалить рубрику «${c.name}»? Статей в ней нет.`;
  const sole = c.soleCount
    ? ` Без единой рубрики останется: ${articles(c.soleCount)} (на сайте — только в разделе «Все»).`
    : "";
  return (
    `Удалить рубрику «${c.name}»? К ней привязано: ${articles(c.postCount)}. ` +
    `Сами статьи не удаляются — рубрика просто будет убрана из них.${sole}`
  );
}

/**
 * The dashboard's «Рубрики» button and the dialog it opens: every rubric,
 * editable and deletable in place.
 *
 * The list comes in as props from the dashboard's server render. Both actions
 * revalidate "/", so after a save or a delete the page re-renders with fresh
 * props while this component — and the dialog's open state — stays mounted.
 *
 * Native `<dialog>` + `showModal()` gives the modal behaviour for free: focus
 * moves inside and is trapped there, Esc closes it, the page behind is inert,
 * and focus goes back to the button on close.
 */
export default function CategoriesDialog({
  categories,
  nameMax,
}: {
  categories: CategoryWithUsage[];
  nameMax: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // A click lands on the <dialog> element itself only over the backdrop (its
  // children fill the whole box). Checking where the press *started* too
  // keeps a text selection dragged out of an input from closing it.
  const pressedOnBackdrop = useRef(false);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        className="admin-btn-ghost admin-dash-btn"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        Рубрики
      </button>

      <dialog
        ref={dialogRef}
        className="admin-dialog"
        aria-labelledby="categories-dialog-title"
        onPointerDown={(e) => {
          pressedOnBackdrop.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (pressedOnBackdrop.current && e.target === e.currentTarget) close();
          pressedOnBackdrop.current = false;
        }}
      >
        <div className="admin-dialog-head">
          <h2 id="categories-dialog-title">Рубрики</h2>
          <button
            type="button"
            className="admin-btn-ghost admin-dialog-close"
            onClick={close}
            aria-label="Закрыть"
            autoFocus
          >
            ✕
          </button>
        </div>

        <div className="admin-dialog-body">
          <p className="admin-hint admin-dialog-hint">
            Переименование сразу меняет рубрику во всех статьях. Порядок — место в списке рубрик на
            сайте: меньше число — выше.
          </p>

          {categories.length === 0 ? (
            <p className="admin-hint">Рубрик пока нет — они создаются в форме статьи.</p>
          ) : (
            <ul className="admin-cat-list">
              {categories.map((c) => (
                <li key={c.id} className="admin-cat-item">
                  <CategoryEditForm id={c.id} name={c.name} sortOrder={c.sort_order} maxLength={nameMax} />
                  <div className="admin-cat-meta">
                    <span className="admin-hint admin-cat-count">
                      {c.postCount === 0 ? "Статей нет" : articles(c.postCount)}
                      {c.soleCount > 0 && ` · единственная рубрика у ${c.soleCount}`}
                    </span>
                    <form action={deleteCategoryAction.bind(null, c.id)}>
                      <ConfirmButton className="admin-btn admin-btn-danger admin-btn-small" confirmText={deleteConfirmText(c)}>
                        Удалить
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
