import "server-only";
import { query, toNumber } from "@/lib/db";
import type { Comment, CommentStatus } from "@/lib/blog";

type CommentRow = {
  id: number;
  post_id: number;
  name: string;
  text: string;
  status: CommentStatus;
  created_at: string;
};

export type CommentWithPost = Comment & { postId: number; postTitle: string; postSlug: string };

function rowToComment(row: CommentRow): Comment {
  return { id: row.id, name: row.name, date: row.created_at, text: row.text, status: row.status };
}

/** Public: only approved comments for a given post, oldest first. */
export async function getApprovedComments(postId: number): Promise<Comment[]> {
  const rows = await query<CommentRow>(
    `SELECT * FROM comments WHERE post_id = $1 AND status = 'approved' ORDER BY created_at ASC`,
    [postId]
  );
  return rows.map(rowToComment);
}

/** Public: a visitor submitting a new comment — always starts pending. */
export async function submitComment(postId: number, name: string, text: string): Promise<void> {
  await query(`INSERT INTO comments (post_id, name, text, status) VALUES ($1, $2, $3, 'pending')`, [
    postId,
    name,
    text,
  ]);
}

/** Admin: every comment, optionally filtered by status, with post context for the list UI. */
export async function getAllComments(status?: CommentStatus): Promise<CommentWithPost[]> {
  const rows = await query<CommentRow & { post_title: string; post_slug: string }>(
    status
      ? `SELECT c.*, p.title as post_title, p.slug as post_slug
         FROM comments c JOIN posts p ON p.id = c.post_id
         WHERE c.status = $1 ORDER BY c.created_at DESC`
      : `SELECT c.*, p.title as post_title, p.slug as post_slug
         FROM comments c JOIN posts p ON p.id = c.post_id
         ORDER BY c.created_at DESC`,
    status ? [status] : undefined
  );

  return rows.map((row) => ({
    ...rowToComment(row),
    postId: row.post_id,
    postTitle: row.post_title,
    postSlug: row.post_slug,
  }));
}

export async function setCommentStatus(id: number, status: CommentStatus): Promise<void> {
  await query(`UPDATE comments SET status = $1 WHERE id = $2`, [status, id]);
}

export async function deleteComment(id: number): Promise<void> {
  await query(`DELETE FROM comments WHERE id = $1`, [id]);
}

export async function countPendingComments(): Promise<number> {
  const rows = await query<{ n: string }>(`SELECT COUNT(*) as n FROM comments WHERE status = 'pending'`);
  return toNumber(rows[0].n);
}
