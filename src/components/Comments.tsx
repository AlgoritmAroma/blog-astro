"use client";

import { useActionState } from "react";
import type { Comment } from "@/lib/blog";
import { formatDate } from "@/lib/format";
import type { CommentFormState } from "@/app/blog/[slug]/actions";

const initialState: CommentFormState = { status: "idle" };

export default function Comments({
  comments,
  action,
}: {
  comments: Comment[];
  action: (prevState: CommentFormState, formData: FormData) => Promise<CommentFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="comments">
      <h2 className="comments__title">Комментарии{comments.length > 0 ? ` (${comments.length})` : ""}</h2>

      {comments.length === 0 ? (
        <p className="comments__empty">Пока нет комментариев — станьте первым.</p>
      ) : (
        <ul className="comments__list">
          {comments.map((c) => (
            <li key={c.id} className="comments__item">
              <div className="comments__item-head">
                <span className="comments__item-name">{c.name}</span>
                <span className="comments__item-date">{formatDate(c.date)}</span>
              </div>
              <p className="comments__item-text">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="comments__form" action={formAction}>
        <p className="comments__form-note">
          Комментарии проходят модерацию — публикуются после проверки.
        </p>
        <input type="text" name="name" placeholder="Ваше имя" required className="comments__input" />
        <textarea
          name="text"
          placeholder="Ваш комментарий"
          required
          rows={4}
          className="comments__textarea"
        />
        <button type="submit" className="btn btn-outline" disabled={pending}>
          {pending ? "Отправка…" : "Отправить на модерацию"}
        </button>
        {state.status === "success" && <p className="comments__sent">{state.message}</p>}
        {state.status === "error" && <p className="comments__error">{state.message}</p>}
      </form>
    </div>
  );
}
