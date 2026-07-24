import "server-only";
import { db } from "@/lib/db";
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
export function getApprovedComments(postId: number): Comment[] {
  const rows = db
    .prepare(`SELECT * FROM comments WHERE post_id = ? AND status = 'approved' ORDER BY created_at ASC`)
    .all(postId) as CommentRow[];
  return rows.map(rowToComment);
}

/** Public: a visitor submitting a new comment — always starts pending. */
export function submitComment(postId: number, name: string, text: string): void {
  db.prepare(`INSERT INTO comments (post_id, name, text, status) VALUES (?, ?, ?, 'pending')`).run(
    postId,
    name,
    text
  );
}

/** Admin: every comment, optionally filtered by status, with post context for the list UI. */
export function getAllComments(status?: CommentStatus): CommentWithPost[] {
  const rows = (
    status
      ? db
          .prepare(
            `SELECT c.*, p.title as post_title, p.slug as post_slug
             FROM comments c JOIN posts p ON p.id = c.post_id
             WHERE c.status = ? ORDER BY c.created_at DESC`
          )
          .all(status)
      : db
          .prepare(
            `SELECT c.*, p.title as post_title, p.slug as post_slug
             FROM comments c JOIN posts p ON p.id = c.post_id
             ORDER BY c.created_at DESC`
          )
          .all()
  ) as (CommentRow & { post_title: string; post_slug: string })[];

  return rows.map((row) => ({
    ...rowToComment(row),
    postId: row.post_id,
    postTitle: row.post_title,
    postSlug: row.post_slug,
  }));
}

export function setCommentStatus(id: number, status: CommentStatus): void {
  db.prepare(`UPDATE comments SET status = ? WHERE id = ?`).run(status, id);
}

export function deleteComment(id: number): void {
  db.prepare(`DELETE FROM comments WHERE id = ?`).run(id);
}

export function countPendingComments(): number {
  return (db.prepare(`SELECT COUNT(*) as n FROM comments WHERE status = 'pending'`).get() as { n: number }).n;
}
