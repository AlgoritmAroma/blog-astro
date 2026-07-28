import "server-only";
import { query } from "@/lib/db";
import type { Comment, CommentStatus } from "@/lib/blog";

type CommentRow = {
  id: number;
  post_id: number;
  name: string;
  text: string;
  status: CommentStatus;
  created_at: string;
};

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
