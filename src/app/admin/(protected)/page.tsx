import Link from "next/link";
import { countPosts } from "@/lib/posts";
import { countPendingComments } from "@/lib/comments";

export default async function AdminDashboard() {
  const postCount = countPosts();
  const pendingCount = countPendingComments();

  return (
    <>
      <h1 style={{ marginBottom: 24 }}>Дашборд</h1>
      <div className="admin-grid-stats">
        <div className="admin-card">
          <div className="admin-stat-num">{postCount}</div>
          <div className="admin-stat-label">Статей</div>
        </div>
        <div className="admin-card">
          <div className="admin-stat-num">{pendingCount}</div>
          <div className="admin-stat-label">Комментариев на модерации</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
        <Link href="/admin/posts/new" className="admin-btn">
          + Новая статья
        </Link>
        <Link href="/admin/comments" className="admin-btn-ghost" style={{ padding: "10px 18px", borderRadius: 8 }}>
          Модерация комментариев
        </Link>
      </div>
    </>
  );
}
