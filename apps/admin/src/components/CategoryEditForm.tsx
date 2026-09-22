"use client";

import { useActionState } from "react";
import { updateCategoryAction, type CategoryFormState } from "@/app/(protected)/actions";

/** One rubric's inline edit row: name + sidebar order, saved in place. */
export default function CategoryEditForm({
  id,
  name,
  sortOrder,
  maxLength,
}: {
  id: number;
  name: string;
  sortOrder: number;
  maxLength: number;
}) {
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(
    updateCategoryAction.bind(null, id),
    {}
  );
  const errorId = `category-${id}-error`;

  // React resets the form to these defaults once the action settles: after a
  // save they are the freshly stored values, after an error what was typed.
  return (
    <form action={formAction} className="admin-cat-form">
      <div className="admin-cat-fields">
        <input
          type="text"
          name="name"
          className="admin-input admin-cat-name"
          defaultValue={state.values?.name ?? name}
          maxLength={maxLength}
          required
          aria-label="Название рубрики"
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? errorId : undefined}
        />
        <input
          type="number"
          name="sortOrder"
          className="admin-input admin-cat-order"
          defaultValue={state.values?.sortOrder ?? sortOrder}
          step={1}
          required
          aria-label="Порядок в списке рубрик"
          title="Порядок в списке рубрик на сайте"
        />
        <button type="submit" className="admin-btn admin-btn-small" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
      {state.error && (
        <p id={errorId} className="admin-error admin-cat-msg" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="admin-hint admin-cat-msg" role="status">
          {state.saved}
        </p>
      )}
    </form>
  );
}
