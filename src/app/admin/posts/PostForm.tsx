"use client";

import { useActionState } from "react";
import { ALL_CATEGORIES } from "@/lib/blog";
import type { PostFormState } from "./actions";

export type PostFormValues = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  publishedAt: string;
  views: number;
  cover?: string;
};

const initialState: PostFormState = {};

export default function PostForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (prevState: PostFormState, formData: FormData) => Promise<PostFormState>;
  initialValues?: PostFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="admin-card" encType="multipart/form-data">
      <div className="admin-form-field">
        <label htmlFor="title">Заголовок</label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="admin-input"
          defaultValue={initialValues?.title}
        />
      </div>

      <div className="admin-form-field">
        <label htmlFor="slug">Slug (необязательно — иначе сгенерируется из заголовка)</label>
        <input
          id="slug"
          name="slug"
          type="text"
          className="admin-input"
          defaultValue={initialValues?.slug}
          placeholder="ostavte-pustym-dlya-avto"
        />
      </div>

      <div className="admin-form-field">
        <label htmlFor="excerpt">Краткое описание</label>
        <textarea
          id="excerpt"
          name="excerpt"
          required
          rows={3}
          className="admin-textarea"
          defaultValue={initialValues?.excerpt}
        />
      </div>

      <div className="admin-form-field">
        <label htmlFor="content">Текст статьи (Markdown)</label>
        <textarea
          id="content"
          name="content"
          required
          rows={16}
          className="admin-textarea"
          defaultValue={initialValues?.content}
        />
      </div>

      <div className="admin-form-field">
        <label htmlFor="category">Категория</label>
        <select id="category" name="category" required className="admin-select" defaultValue={initialValues?.category ?? ""}>
          <option value="" disabled>
            Выберите категорию
          </option>
          {ALL_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-form-field">
        <label htmlFor="publishedAt">Дата публикации</label>
        <input
          id="publishedAt"
          name="publishedAt"
          type="date"
          required
          className="admin-input"
          defaultValue={initialValues?.publishedAt}
        />
      </div>

      <div className="admin-form-field">
        <label htmlFor="views">Просмотры (для соц. доказательства)</label>
        <input
          id="views"
          name="views"
          type="number"
          min={0}
          className="admin-input"
          defaultValue={initialValues?.views ?? 1000}
        />
      </div>

      <div className="admin-form-field">
        <label htmlFor="cover">
          Обложка{initialValues?.cover ? " (оставьте пустым, чтобы сохранить текущую)" : ""}
        </label>
        {initialValues?.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={initialValues.cover}
            alt=""
            style={{ width: 120, aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 8, marginBottom: 4 }}
          />
        )}
        <input
          id="cover"
          name="cover"
          type="file"
          accept="image/*"
          className="admin-input"
          required={!initialValues?.cover}
        />
      </div>

      <button type="submit" className="admin-btn" disabled={pending}>
        {pending ? "Сохранение…" : submitLabel}
      </button>

      {state.error && <p className="admin-error">{state.error}</p>}
    </form>
  );
}
