"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { deleteCategory, normalizeCategoryName, updateCategory } from "@/lib/categories";

export type CategoryFormState = { error?: string; saved?: string };

/** Sidebar position. Seeded rubrics used 1–8 and new ones default to 100, so
 * anything a person would type fits comfortably in this range. */
const SORT_ORDER_MIN = -9999;
const SORT_ORDER_MAX = 9999;

/**
 * Nothing in the public blog is cached — every page that lists rubrics reads
 * them per request (`connection()`) — and the blog is a separate app anyway,
 * so there is no cache of its to drop. Only the admin's own pages that show
 * rubric names are refreshed here.
 */
function refreshAdminPages() {
  revalidatePath("/categories");
  revalidatePath("/posts");
}

export async function updateCategoryAction(
  id: number,
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  await requireAdmin();

  const name = normalizeCategoryName(String(formData.get("name") ?? ""));
  if (!name) return { error: "Введите название рубрики." };

  const sortRaw = String(formData.get("sortOrder") ?? "").trim();
  const sortOrder = Number(sortRaw);
  if (!sortRaw || !Number.isInteger(sortOrder) || sortOrder < SORT_ORDER_MIN || sortOrder > SORT_ORDER_MAX) {
    return { error: `Порядок — целое число от ${SORT_ORDER_MIN} до ${SORT_ORDER_MAX}.` };
  }

  const result = await updateCategory(id, name, sortOrder);
  if (!result.ok) {
    if (result.error === "duplicate") {
      return { error: `Рубрика «${result.conflict}» уже существует — выберите другое название.` };
    }
    return { error: "Рубрика не найдена — возможно, её уже удалили. Обновите страницу." };
  }

  refreshAdminPages();
  return {
    saved: result.postCount
      ? `Сохранено. Рубрика обновлена в статьях: ${result.postCount}.`
      : "Сохранено.",
  };
}

export async function deleteCategoryAction(id: number): Promise<void> {
  await requireAdmin();
  await deleteCategory(id);
  refreshAdminPages();
}
