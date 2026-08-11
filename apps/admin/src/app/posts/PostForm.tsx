"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import BlockEditor, { stripIds, withIds, type EditorBlock } from "@/components/BlockEditor";
import ImageField from "@/components/ImageField";
import LeaveGuard from "@/components/LeaveGuard";
import { PAGE_BACKGROUNDS, DEFAULT_BACKGROUND, type Block } from "@/lib/blocks";
import { pluralRu } from "@/lib/format";
import { slugify } from "@/lib/slugify";
import type { PostFormState } from "./actions";

export type PostFormValues = {
  title: string;
  metaTitle: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readingTime: number | null;
  cover: string;
  coverAlt: string;
  bgColor: string;
  blocks: Block[];
};

const initialState: PostFormState = {};

const NEW_CATEGORY = "__new__";

/** Google truncates the search-result title somewhere around here. Not a
 * validation limit — an editor may well have a reason to go longer — so the
 * counter turns amber rather than blocking the save. */
const META_TITLE_SOFT_LIMIT = 60;

/** Today's date in the *browser's* timezone, as yyyy-mm-dd. The server's
 * timezone is irrelevant here — the editor means "today" as they see it. */
function todayLocal(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

type Draft = { savedAt: number; values: PostFormValues };

export default function PostForm({
  action,
  initialValues,
  submitLabel,
  categories,
  draftKey,
}: {
  action: (prevState: PostFormState, formData: FormData) => Promise<PostFormState>;
  initialValues?: PostFormValues;
  submitLabel: string;
  categories: string[];
  /** Distinguishes the new-article draft from each existing article's draft. */
  draftKey: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [metaTitle, setMetaTitle] = useState(initialValues?.metaTitle ?? "");
  const [slug, setSlug] = useState(initialValues?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initialValues?.excerpt ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [newCategory, setNewCategory] = useState("");
  // A new article defaults to *today in the editor's own timezone*. The
  // initialiser is guarded because it also runs on the server, where "today"
  // is whatever the container's clock says — the server therefore renders an
  // empty field and the browser fills it in during hydration (hence
  // suppressHydrationWarning on the input).
  const [publishedAt, setPublishedAt] = useState(
    () => initialValues?.publishedAt ?? (typeof window === "undefined" ? "" : todayLocal())
  );
  // Empty means "estimate it from the text" — the behaviour every article had
  // before the field existed.
  const [readingTime, setReadingTime] = useState(
    initialValues?.readingTime == null ? "" : String(initialValues.readingTime)
  );
  const [cover, setCover] = useState(initialValues?.cover ?? "");
  const [coverAlt, setCoverAlt] = useState(initialValues?.coverAlt ?? "");
  const [bgColor, setBgColor] = useState(initialValues?.bgColor || DEFAULT_BACKGROUND);
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => withIds(initialValues?.blocks ?? []));

  const [foundDraft, setFoundDraft] = useState<Draft | null>(null);

  const storageKey = `aiastro:post-draft:${draftKey}`;
  const slugHint = slugify(slug || title) || "post";

  const values: PostFormValues = useMemo(
    () => ({
      title,
      metaTitle,
      slug,
      excerpt,
      category: category === NEW_CATEGORY ? newCategory : category,
      publishedAt,
      readingTime: readingTime.trim() === "" ? null : Number(readingTime) || null,
      cover,
      coverAlt,
      bgColor,
      blocks: stripIds(blocks),
    }),
    [
      title,
      metaTitle,
      slug,
      excerpt,
      category,
      newCategory,
      publishedAt,
      readingTime,
      cover,
      coverAlt,
      bgColor,
      blocks,
    ]
  );

  const serialized = JSON.stringify(values);

  // The form as it was handed to us. Held in state (never updated) rather
  // than recomputed, so "unsaved changes" stays a pure comparison.
  const [baseline] = useState(() =>
    JSON.stringify({
      title: initialValues?.title ?? "",
      metaTitle: initialValues?.metaTitle ?? "",
      slug: initialValues?.slug ?? "",
      excerpt: initialValues?.excerpt ?? "",
      category: initialValues?.category ?? "",
      publishedAt: initialValues?.publishedAt ?? (typeof window === "undefined" ? "" : todayLocal()),
      readingTime: initialValues?.readingTime ?? null,
      cover: initialValues?.cover ?? "",
      coverAlt: initialValues?.coverAlt ?? "",
      bgColor: initialValues?.bgColor || DEFAULT_BACKGROUND,
      blocks: initialValues?.blocks ?? [],
    })
  );

  // `pending` covers the submit itself: while the action is in flight there's
  // nothing to warn about, and if it comes back with an error the form is
  // still mounted and intact, so this flips back to dirty on its own.
  const dirty = serialized !== baseline && !pending;

  // Offer to restore a draft rather than silently overwriting the form with
  // it — an editor who navigated away on purpose shouldn't find yesterday's
  // abandoned text back in their fields.
  useEffect(() => {
    let draft: Draft | null = null;
    try {
      const stored = window.localStorage.getItem(storageKey);
      draft = stored ? (JSON.parse(stored) as Draft) : null;
    } catch {
      // Corrupt or unavailable storage is not worth surfacing.
    }
    if (!draft?.values || JSON.stringify(draft.values) === baseline) return;
    // A one-shot read of an external store (localStorage) on mount. Doing it
    // in a render-time initialiser instead would make the server render a
    // page without this banner and the browser render one with it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFoundDraft(draft);
  }, [storageKey, baseline]);

  // Autosave. Debounced so typing doesn't hit localStorage on every keystroke.
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ savedAt: Date.now(), values } satisfies Draft)
        );
      } catch {
        // Quota exceeded / private mode — autosave is a nicety, not a feature
        // worth failing the form over.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [dirty, storageKey, values, serialized]);

  function applyDraft(draft: Draft) {
    setTitle(draft.values.title);
    setMetaTitle(draft.values.metaTitle ?? "");
    setSlug(draft.values.slug);
    setExcerpt(draft.values.excerpt);
    setCategory(draft.values.category);
    setPublishedAt(draft.values.publishedAt);
    setReadingTime(draft.values.readingTime == null ? "" : String(draft.values.readingTime));
    setCover(draft.values.cover);
    setCoverAlt(draft.values.coverAlt);
    setBgColor(draft.values.bgColor || DEFAULT_BACKGROUND);
    setBlocks(withIds(draft.values.blocks ?? []));
    setFoundDraft(null);
  }

  function discardDraft() {
    window.localStorage.removeItem(storageKey);
    setFoundDraft(null);
  }

  return (
    <>
      <LeaveGuard dirty={dirty} backHref="/posts" className="admin-form-topbar" />

      {foundDraft && (
        <div className="admin-notice">
          <div>
            <strong>Найден несохранённый черновик</strong>
            <div className="admin-hint">
              Сохранён {new Date(foundDraft.savedAt).toLocaleString("ru-RU")} в этом браузере.
            </div>
          </div>
          <div className="admin-inline-actions">
            <button type="button" className="admin-btn admin-btn-small" onClick={() => applyDraft(foundDraft)}>
              Восстановить
            </button>
            <button type="button" className="admin-btn-ghost admin-btn-small" onClick={discardDraft}>
              Отклонить
            </button>
          </div>
        </div>
      )}

      <form
        action={formAction}
        className="admin-card"
        onSubmit={() => {
          // The action either redirects (success — the draft is obsolete) or
          // returns an error, in which case the form is still mounted with
          // every field intact and the autosave effect writes the draft again
          // on the next keystroke.
          try {
            window.localStorage.removeItem(storageKey);
          } catch {
            /* ignore */
          }
        }}
      >
        <div className="admin-form-field">
          <label htmlFor="title">Заголовок H1</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            className="admin-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="admin-form-field">
          <label htmlFor="metaTitle">Title для поисковика (мета-тег)</label>
          <input
            id="metaTitle"
            name="metaTitle"
            type="text"
            className="admin-input"
            placeholder="Если пусто — берётся заголовок H1"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
          />
          <p className="admin-hint">
            Показывается во вкладке браузера и строкой результата в Google. Идёт целиком, без
            добавки «— Блог Astro AI».
            {metaTitle.trim() !== "" && (
              <>
                {" "}
                <span className={metaTitle.length > META_TITLE_SOFT_LIMIT ? "admin-hint-warn" : undefined}>
                  {metaTitle.length} {pluralRu(metaTitle.length, "символ", "символа", "символов")}
                  {metaTitle.length > META_TITLE_SOFT_LIMIT &&
                    ` — длиннее ${META_TITLE_SOFT_LIMIT}, Google скорее всего обрежет`}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="admin-form-field">
          <label htmlFor="slug">Slug (необязательно — иначе сгенерируется из заголовка)</label>
          <input
            id="slug"
            name="slug"
            type="text"
            className="admin-input"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="ostavte-pustym-dlya-avto"
          />
          {(slug || title) && <p className="admin-hint">Адрес статьи: /blog/{slugHint}</p>}
        </div>

        <div className="admin-form-field">
          <label htmlFor="excerpt">Краткое описание (анонс в списке статей и в поиске)</label>
          <textarea
            id="excerpt"
            name="excerpt"
            required
            rows={2}
            className="admin-textarea"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
          />
          <p className="admin-hint">
            Уходит в мета-тег description — это текст под ссылкой в результатах поиска. Он же
            стоит подписью под карточкой статьи в списке блога.
          </p>
        </div>

        <ImageField
          kind="covers"
          slugHint={slugHint}
          label="Обложка статьи (она же превью в списке блога)"
          aspect="3 / 2"
          value={cover}
          onChange={({ src }) => setCover(src)}
        />
        <input type="hidden" name="cover" value={cover} />

        <div className="admin-form-field">
          <label htmlFor="coverAlt">ALT обложки</label>
          <input
            id="coverAlt"
            name="coverAlt"
            type="text"
            className="admin-input"
            placeholder="Если пусто — используется заголовок статьи"
            value={coverAlt}
            onChange={(e) => setCoverAlt(e.target.value)}
          />
        </div>

        <fieldset className="admin-fieldset">
          <legend>Тело статьи</legend>
          <p className="admin-hint">
            Статья собирается из блоков. Порядок меняется стрелками, любой блок можно вставить
            между двумя другими.
          </p>
          <BlockEditor blocks={blocks} onChange={setBlocks} slugHint={slugHint} />
        </fieldset>
        <input type="hidden" name="blocks" value={JSON.stringify(stripIds(blocks))} />

        <div className="admin-form-field">
          <label htmlFor="category">Категория</label>
          <select
            id="category"
            className="admin-select"
            value={categories.includes(category) || category === "" ? category : NEW_CATEGORY}
            onChange={(e) => {
              if (e.target.value === NEW_CATEGORY) {
                setCategory(NEW_CATEGORY);
                setNewCategory("");
              } else {
                setCategory(e.target.value);
              }
            }}
          >
            <option value="" disabled>
              Выберите категорию
            </option>
            {categories.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>+ Новая категория…</option>
          </select>
          {category === NEW_CATEGORY && (
            <input
              type="text"
              className="admin-input"
              placeholder="Название новой категории"
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
          )}
          {/* One field reaches the server either way: the picked rubric or the
              typed one. The action creates it if it doesn't exist yet. */}
          <input type="hidden" name="category" value={values.category} />
        </div>

        <fieldset className="admin-fieldset">
          <legend>Фон страницы</legend>
          <p className="admin-hint">Чтобы страницы блога отличались друг от друга.</p>
          <div className="admin-swatches">
            {PAGE_BACKGROUNDS.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.label}
                aria-label={option.label}
                aria-pressed={bgColor === option.value}
                className={`admin-swatch${bgColor === option.value ? " is-active" : ""}`}
                style={{ background: option.value }}
                onClick={() => setBgColor(option.value)}
              />
            ))}
          </div>
          <input type="hidden" name="bgColor" value={bgColor} />
        </fieldset>

        <div className="admin-form-row">
          <div className="admin-form-field">
            <label htmlFor="publishedAt">Дата публикации</label>
            <input
              id="publishedAt"
              name="publishedAt"
              type="date"
              required
              className="admin-input"
              // The default is computed from the browser's clock, so the SSR
              // markup deliberately differs from the hydrated value.
              suppressHydrationWarning
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
            <p className="admin-hint">По умолчанию — сегодня, но дату можно поставить любую.</p>
          </div>

          <div className="admin-form-field">
            <label htmlFor="readingTime">Время чтения, мин</label>
            <input
              id="readingTime"
              name="readingTime"
              type="number"
              min={1}
              max={600}
              className="admin-input"
              placeholder="авто"
              value={readingTime}
              onChange={(e) => setReadingTime(e.target.value)}
            />
            <p className="admin-hint">
              Пусто — считается по тексту статьи (≈180 слов в минуту). Заполнено — показывается
              ваше число.
            </p>
          </div>

        </div>

        <div className="admin-form-actions">
          <button type="submit" className="admin-btn" disabled={pending}>
            {pending ? "Сохранение…" : submitLabel}
          </button>
          {/* A real link, not a second LeaveGuard — the guard mounted above
              intercepts every in-app link on the page, so this gets the
              confirmation modal for free and there's only ever one of it. */}
          <a href="/posts" className="admin-btn-ghost admin-btn-link">
            Отмена
          </a>
        </div>

        {state.error && <p className="admin-error">{state.error}</p>}
      </form>
    </>
  );
}
