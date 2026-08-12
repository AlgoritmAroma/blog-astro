"use client";

import { useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE, MAX_UPLOAD_BYTES } from "@/lib/upload-constants";

/**
 * Uploads an image the moment it is picked and reports back the stored path.
 *
 * Uploading up front (instead of attaching the file to the article form) is
 * what stops a rejected image from taking the whole article with it: the form
 * is never submitted, so nothing else on the page is touched, and the error
 * appears next to the field that caused it.
 */
export type UploadedImage = { src: string; width: number; height: number };

export default function ImageField({
  value,
  onChange,
  kind,
  slugHint,
  label,
  aspect,
}: {
  value: string;
  /** `src` is empty when the image is removed; the dimensions come straight
   * from sharp so the blog can reserve space for it. */
  onChange: (image: UploadedImage) => void;
  kind: "covers" | "content";
  slugHint: string;
  label: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    // Checked here as well as on the server: without it an oversized file is
    // pushed over the network in full before anything says no, and if a proxy
    // in front of the app cuts the request short the editor gets a bare
    // transport error instead of a sentence naming the ceiling.
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ — сожмите изображение.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      body.append("slug", slugHint);

      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as Partial<UploadedImage> & { error?: string };

      if (!res.ok || !data.src) {
        setError(data.error ?? `Не удалось загрузить изображение (код ${res.status}).`);
        return;
      }
      onChange({ src: data.src, width: data.width ?? 0, height: data.height ?? 0 });
    } catch {
      setError("Сеть недоступна — изображение не загрузилось.");
    } finally {
      setBusy(false);
      // Reset the input so re-picking the same file after an error still
      // fires a change event.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="admin-form-field">
      <label>{label}</label>

      {value && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="admin-image-preview"
            style={{ aspectRatio: aspect }}
          />
          {/* The preview is the stored file, already cropped — so what is on
              screen here is exactly what the blog will show. Said out loud
              because the crop happens server-side, out of sight, and an
              editor who doesn't know it happened reads a bad crop as a bug in
              the site rather than as something a different photo would fix. */}
          {aspect && (
            <p className="admin-hint">
              Так обложка и будет выглядеть на сайте — она обрезана до {aspect.replace(" / ", ":")}{" "}
              автоматически. Если срезано важное, загрузите горизонтальный кадр или обрежьте
              картинку заранее.
            </p>
          )}
        </>
      )}

      <div className="admin-inline-actions">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="admin-input"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        {value && (
          <button
            type="button"
            className="admin-btn-ghost admin-btn-small"
            onClick={() => onChange({ src: "", width: 0, height: 0 })}
          >
            Удалить
          </button>
        )}
      </div>

      {busy && <p className="admin-hint">Загружаем и сжимаем…</p>}
      {error && <p className="admin-error">{error}</p>}
    </div>
  );
}
