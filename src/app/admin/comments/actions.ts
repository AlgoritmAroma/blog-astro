"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { setCommentStatus, deleteComment } from "@/lib/comments";

export async function approveCommentAction(id: number): Promise<void> {
  await requireAdmin();
  setCommentStatus(id, "approved");
  revalidatePath("/admin/comments");
}

export async function rejectCommentAction(id: number): Promise<void> {
  await requireAdmin();
  setCommentStatus(id, "rejected");
  revalidatePath("/admin/comments");
}

export async function deleteCommentAction(id: number): Promise<void> {
  await requireAdmin();
  deleteComment(id);
  revalidatePath("/admin/comments");
}
