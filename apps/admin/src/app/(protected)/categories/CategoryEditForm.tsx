"use client";

import { useActionState } from "react";
import { updateCategoryAction, type CategoryFormState } from "./actions";

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

  return (
    <form action={formAction}>
      <div className="admin-row-actions" style={{ alignItems: "center" }}>
        <input
          type="text"
          name="name"
          className="admin-input"
          defaultValue={name}
          maxLength={maxLength}
          required
          aria-label="Название рубрики"
          style={{ minWidth: 220, flex: "1 1 220px" }}
        />
        <input
          type="number"
          name="sortOrder"
          className="admin-input"
          defaultValue={sortOrder}
          step={1}
          required
          aria-label="Порядок в списке"
          title="Порядок в списке рубрик"
          style={{ width: 90 }}
        />
        <button
          type="submit"
          className="admin-btn"
          disabled={pending}
          style={{ padding: "6px 14px", fontSize: "0.85rem" }}
        >
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
      </div>
      {state.error && (
        <p className="admin-error" role="alert" style={{ marginTop: 6 }}>
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="admin-hint" role="status">
          {state.saved}
        </p>
      )}
    </form>
  );
}
