"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { deleteCategory, normalizeCategoryName, updateCategory } from "@/lib/categories";

export type CategoryFormState = {
  error?: string;
  saved?: string;
  /** What was submitted, handed back on an error so React's post-action
   * form reset doesn't wipe the editor's typing along with the mistake. */
  values?: { name: string; sortOrder: string };
};

/** Sidebar position. Seeded rubrics used 1–8 and new ones default to 100, so
 * anything a person would type fits comfortably in this range. */
const SORT_ORDER_MIN = -9999;
const SORT_ORDER_MAX = 9999;

/**
 * Rubrics are managed from the dashboard's «Рубрики» dialog. Revalidating "/"
 * re-renders the dashboard in the same round trip as the action, so the list
 * in the still-open dialog updates in place; "/posts" shows rubric names too.
 *
 * Nothing in the public blog is cached — every page that lists rubrics reads
 * them per request (`connection()`) — and the blog is a separate app anyway,
 * so there is no cache of its to drop.
 */
function refreshAdminPages() {
  revalidatePath("/");
  revalidatePath("/posts");
}

export async function updateCategoryAction(
  id: number,
  _prevState: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  await requireAdmin();

  const rawName = String(formData.get("name") ?? "");
  const sortRaw = String(formData.get("sortOrder") ?? "").trim();
  const values = { name: rawName, sortOrder: sortRaw };

  const name = normalizeCategoryName(rawName);
  if (!name) return { error: "Введите название рубрики.", values };

  const sortOrder = Number(sortRaw);
  if (!sortRaw || !Number.isInteger(sortOrder) || sortOrder < SORT_ORDER_MIN || sortOrder > SORT_ORDER_MAX) {
    return { error: `Порядок — целое число от ${SORT_ORDER_MIN} до ${SORT_ORDER_MAX}.`, values };
  }

  const result = await updateCategory(id, name, sortOrder);
  if (!result.ok) {
    if (result.error === "duplicate") {
      return { error: `Рубрика «${result.conflict}» уже существует — выберите другое название.`, values };
    }
    return { error: "Рубрика не найдена — возможно, её уже удалили." };
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
