"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { ensureCategory } from "@/lib/categories";
import {
  blocksToPlainText,
  parseBlocksJson,
  isPageBackground,
  isCoverPath,
  stripInlineHtml,
  DEFAULT_BACKGROUND,
  type Block,
} from "@/lib/blocks";
import { createPost, updatePost, deletePost, getPostById, type PostInput } from "@/lib/posts";
import { slugify } from "@/lib/slugify";

export type PostFormState = { error?: string };

type ParsedFields = {
  slug: string;
  title: string;
  excerpt: string;
  blocks: Block[];
  content: string;
  category: string;
  publishedAt: string;
  views: number;
  cover: string;
  coverAlt: string;
  bgColor: string;
};

/**
 * Everything the client sends is re-validated here — the block payload
 * arrives as a JSON string built in the browser, so `parseBlocksJson` is both
 * the schema check and the HTML sanitizer for the article body.
 */
async function parseFields(
  formData: FormData,
  existingCover?: string
): Promise<{ ok: true; fields: ParsedFields } | { ok: false; error: string }> {
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const publishedAt = String(formData.get("publishedAt") ?? "").trim();
  const viewsRaw = String(formData.get("views") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "").trim();
  const bgRaw = String(formData.get("bgColor") ?? "").trim();
  const coverRaw = String(formData.get("cover") ?? "").trim();
  const coverAlt = stripInlineHtml(String(formData.get("coverAlt") ?? "").trim()).slice(0, 300);

  if (!title || !excerpt || !publishedAt) {
    return { ok: false, error: "Заполните заголовок, краткое описание и дату публикации." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt)) {
    return { ok: false, error: "Дата публикации указана в неверном формате." };
  }

  const blocks = parseBlocksJson(String(formData.get("blocks") ?? "[]"));
  if (blocks.length === 0) {
    return { ok: false, error: "Добавьте хотя бы один блок в тело статьи." };
  }

  const category = await ensureCategory(categoryRaw);
  if (!category) {
    return { ok: false, error: "Выберите категорию или введите название новой." };
  }

  const cover = coverRaw || existingCover || "";
  if (!cover) {
    return { ok: false, error: "Загрузите обложку статьи." };
  }
  if (!isCoverPath(cover)) {
    return { ok: false, error: "Обложка указана неверно — загрузите изображение заново." };
  }

  const slug = slugify(slugRaw || title);
  if (!slug) {
    return { ok: false, error: "Не удалось получить корректный slug — измените заголовок." };
  }

  const views = viewsRaw ? Number(viewsRaw) : 1000;
  if (!Number.isFinite(views) || views < 0) {
    return { ok: false, error: "Просмотры должны быть неотрицательным числом." };
  }

  return {
    ok: true,
    fields: {
      slug,
      title,
      excerpt,
      blocks,
      // Plain-text mirror of the blocks. Reading-time estimation reads this
      // column, and it keeps the pre-constructor markdown fallback on the
      // blog working off a single source.
      content: blocksToPlainText(blocks),
      category,
      publishedAt,
      views,
      cover,
      coverAlt,
      bgColor: isPageBackground(bgRaw) ? bgRaw : DEFAULT_BACKGROUND,
    },
  };
}

function toInput(fields: ParsedFields): PostInput {
  return {
    slug: fields.slug,
    title: fields.title,
    excerpt: fields.excerpt,
    content: fields.content,
    blocks: fields.blocks,
    category: fields.category,
    cover: fields.cover,
    coverAlt: fields.coverAlt,
    bgColor: fields.bgColor,
    publishedAt: fields.publishedAt,
    views: fields.views,
  };
}

function isUniqueViolation(err: unknown): boolean {
  // Postgres SQLSTATE 23505 = unique_violation.
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export async function createPostAction(_prevState: PostFormState, formData: FormData): Promise<PostFormState> {
  await requireAdmin();

  const parsed = await parseFields(formData);
  if (!parsed.ok) return { error: parsed.error };

  let id: number;
  try {
    id = await createPost(toInput(parsed.fields));
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `Статья со slug "${parsed.fields.slug}" уже существует.` };
    throw err;
  }

  redirect(`/posts/${id}/edit?saved=1`);
}

export async function updatePostAction(
  id: number,
  _prevState: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  await requireAdmin();

  const existing = await getPostById(id);
  if (!existing) return { error: "Статья не найдена." };

  const parsed = await parseFields(formData, existing.cover);
  if (!parsed.ok) return { error: parsed.error };

  try {
    await updatePost(id, toInput(parsed.fields));
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `Статья со slug "${parsed.fields.slug}" уже существует.` };
    throw err;
  }

  redirect(`/posts/${id}/edit?saved=1`);
}

export async function deletePostAction(id: number): Promise<void> {
  await requireAdmin();
  await deletePost(id);
  redirect("/posts");
}
