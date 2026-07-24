"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { ALL_CATEGORIES, type Category } from "@/lib/blog";
import { createPost, updatePost, deletePost, getPostById, type PostInput } from "@/lib/posts";
import { saveCoverImage } from "@/lib/upload";
import { slugify } from "@/lib/slugify";

export type PostFormState = { error?: string };

function isCategory(value: string): value is Category {
  return (ALL_CATEGORIES as readonly string[]).includes(value);
}

type ParsedFields =
  | { ok: true; slug: string; title: string; excerpt: string; content: string; category: Category; publishedAt: string; views: number }
  | { ok: false; error: string };

function parseFields(formData: FormData): ParsedFields {
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const publishedAt = String(formData.get("publishedAt") ?? "").trim();
  const viewsRaw = String(formData.get("views") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();

  if (!title || !excerpt || !content || !publishedAt) {
    return { ok: false, error: "Заполните все обязательные поля." };
  }
  if (!isCategory(category)) {
    return { ok: false, error: "Выберите категорию из списка." };
  }

  const slug = slugify(slugRaw || title);
  if (!slug) {
    return { ok: false, error: "Не удалось получить корректный slug — измените заголовок." };
  }

  const views = viewsRaw ? Number(viewsRaw) : 1000;
  if (!Number.isFinite(views) || views < 0) {
    return { ok: false, error: "Просмотры должны быть неотрицательным числом." };
  }

  return { ok: true, slug, title, excerpt, content, category, publishedAt, views };
}

async function resolveCover(
  formData: FormData,
  slugHint: string,
  existingCover?: string
): Promise<{ ok: true; cover: string } | { ok: false; error: string }> {
  const file = formData.get("cover");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, error: "Файл обложки должен быть изображением." };
    }
    try {
      return { ok: true, cover: await saveCoverImage(file, slugHint) };
    } catch {
      return { ok: false, error: "Не удалось обработать изображение обложки — проверьте файл." };
    }
  }
  if (existingCover) return { ok: true, cover: existingCover };
  return { ok: false, error: "Загрузите обложку статьи." };
}

function isUniqueViolation(err: unknown): boolean {
  // Postgres SQLSTATE 23505 = unique_violation.
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "23505";
}

export async function createPostAction(_prevState: PostFormState, formData: FormData): Promise<PostFormState> {
  await requireAdmin();

  const fields = parseFields(formData);
  if (!fields.ok) return { error: fields.error };

  const cover = await resolveCover(formData, fields.slug);
  if (!cover.ok) return { error: cover.error };

  const input: PostInput = {
    slug: fields.slug,
    title: fields.title,
    excerpt: fields.excerpt,
    content: fields.content,
    category: fields.category,
    cover: cover.cover,
    publishedAt: fields.publishedAt,
    views: fields.views,
  };

  let id: number;
  try {
    id = await createPost(input);
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `Статья со slug "${fields.slug}" уже существует.` };
    throw err;
  }

  redirect(`/admin/posts/${id}/edit?saved=1`);
}

export async function updatePostAction(
  id: number,
  _prevState: PostFormState,
  formData: FormData
): Promise<PostFormState> {
  await requireAdmin();

  const existing = await getPostById(id);
  if (!existing) return { error: "Статья не найдена." };

  const fields = parseFields(formData);
  if (!fields.ok) return { error: fields.error };

  const cover = await resolveCover(formData, fields.slug, existing.cover);
  if (!cover.ok) return { error: cover.error };

  const input: PostInput = {
    slug: fields.slug,
    title: fields.title,
    excerpt: fields.excerpt,
    content: fields.content,
    category: fields.category,
    cover: cover.cover,
    publishedAt: fields.publishedAt,
    views: fields.views,
  };

  try {
    await updatePost(id, input);
  } catch (err) {
    if (isUniqueViolation(err)) return { error: `Статья со slug "${fields.slug}" уже существует.` };
    throw err;
  }

  redirect(`/admin/posts/${id}/edit?saved=1`);
}

export async function deletePostAction(id: number): Promise<void> {
  await requireAdmin();
  await deletePost(id);
  redirect("/admin/posts");
}
