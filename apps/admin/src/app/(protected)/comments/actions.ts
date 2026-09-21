"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { setCommentStatus, deleteComment } from "@/lib/comments";

export async function approveCommentAction(id: number): Promise<void> {
  await requireAdmin();
  await setCommentStatus(id, "approved");
  revalidatePath("/comments");
}

export async function rejectCommentAction(id: number): Promise<void> {
  await requireAdmin();
  await setCommentStatus(id, "rejected");
  revalidatePath("/comments");
}

export async function deleteCommentAction(id: number): Promise<void> {
  await requireAdmin();
  await deleteComment(id);
  revalidatePath("/comments");
}
