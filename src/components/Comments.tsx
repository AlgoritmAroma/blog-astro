"use client";

import { useState } from "react";
import type { Comment } from "@/lib/blog";
import { formatDate } from "@/lib/format";

const MODERATION_EMAIL = "info@aiastro.ru";

export default function Comments({
  comments,
  postTitle,
}: {
  comments: Comment[];
  postTitle: string;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;

    const subject = `Новый комментарий к статье: ${postTitle}`;
    const body = `Имя: ${name}\n\nКомментарий:\n${text}\n\nСтраница: ${
      typeof window !== "undefined" ? window.location.href : ""
    }`;
    window.location.href = `mailto:${MODERATION_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    setSent(true);
    setName("");
    setText("");
  }

  return (
    <div className="comments">
      <h2 className="comments__title">Комментарии{comments.length > 0 ? ` (${comments.length})` : ""}</h2>

      {comments.length === 0 ? (
        <p className="comments__empty">Пока нет комментариев — станьте первым.</p>
      ) : (
        <ul className="comments__list">
          {comments.map((c, i) => (
            <li key={i} className="comments__item">
              <div className="comments__item-head">
                <span className="comments__item-name">{c.name}</span>
                <span className="comments__item-date">{formatDate(c.date)}</span>
              </div>
              <p className="comments__item-text">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="comments__form" onSubmit={handleSubmit}>
        <p className="comments__form-note">
          Комментарии проходят модерацию — публикуются после проверки.
        </p>
        <input
          type="text"
          placeholder="Ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="comments__input"
        />
        <textarea
          placeholder="Ваш комментарий"
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          rows={4}
          className="comments__textarea"
        />
        <button type="submit" className="btn btn-outline">
          Отправить на модерацию
        </button>
        {sent && (
          <p className="comments__sent">
            Откроется письмо для отправки комментария редакции — после проверки он появится здесь.
          </p>
        )}
      </form>
    </div>
  );
}
