"use server";

import { submitComment } from "@/lib/comments";

export type CommentFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function submitCommentAction(
  postId: number,
  _prevState: CommentFormState,
  formData: FormData
): Promise<CommentFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();

  if (!name || !text) {
    return { status: "error", message: "Заполните имя и комментарий." };
  }
  if (name.length > 80 || text.length > 2000) {
    return { status: "error", message: "Слишком длинный текст." };
  }

  submitComment(postId, name, text);
  return { status: "success", message: "Спасибо! Комментарий отправлен на модерацию и появится после проверки." };
}
