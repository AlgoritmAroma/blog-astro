import Link from "next/link";
import type { CommentStatus } from "@/lib/blog";
import { getAllComments } from "@/lib/comments";
import { formatDate } from "@/lib/format";
import ConfirmButton from "@/components/ConfirmButton";
import { approveCommentAction, rejectCommentAction, deleteCommentAction } from "./actions";

const TABS: { label: string; value: CommentStatus | "all" }[] = [
  { label: "Все", value: "all" },
  { label: "На модерации", value: "pending" },
  { label: "Одобренные", value: "approved" },
  { label: "Отклонённые", value: "rejected" },
];

const STATUS_LABEL: Record<CommentStatus, string> = {
  pending: "на модерации",
  approved: "одобрен",
  rejected: "отклонён",
};

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeStatus = (status ?? "all") as CommentStatus | "all";
  const comments = await getAllComments(activeStatus === "all" ? undefined : (activeStatus as CommentStatus));

  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Комментарии</h1>

      <div className="admin-row-actions" style={{ marginBottom: 20 }}>
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "all" ? "/admin/comments" : `/admin/comments?status=${tab.value}`}
            className={activeStatus === tab.value ? "admin-btn" : "admin-btn-ghost"}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: "0.85rem" }}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Статья</th>
              <th>Автор</th>
              <th>Комментарий</th>
              <th>Дата</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/blog/${c.postSlug}`} target="_blank">
                    {c.postTitle}
                  </Link>
                </td>
                <td>{c.name}</td>
                <td style={{ maxWidth: 320 }}>{c.text}</td>
                <td>{formatDate(c.date)}</td>
                <td>
                  <span className={`admin-badge admin-badge-${c.status}`}>{STATUS_LABEL[c.status]}</span>
                </td>
                <td>
                  <div className="admin-row-actions">
                    {c.status !== "approved" && (
                      <form action={approveCommentAction.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="admin-btn"
                          style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.85rem" }}
                        >
                          Одобрить
                        </button>
                      </form>
                    )}
                    {c.status !== "rejected" && (
                      <form action={rejectCommentAction.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="admin-btn-ghost"
                          style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.85rem" }}
                        >
                          Отклонить
                        </button>
                      </form>
                    )}
                    <form action={deleteCommentAction.bind(null, c.id)}>
                      <ConfirmButton
                        className="admin-btn-danger"
                        confirmText="Удалить комментарий?"
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          fontSize: "0.85rem",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          fontWeight: 700,
                        }}
                      >
                        Удалить
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {comments.length === 0 && (
              <tr>
                <td colSpan={6} style={{ opacity: 0.6 }}>
                  Нет комментариев.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
