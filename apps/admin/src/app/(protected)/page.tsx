import Link from "next/link";
import { countPosts } from "@/lib/posts";
import { countPendingComments } from "@/lib/comments";
import { CATEGORY_NAME_MAX, getCategoriesWithUsage } from "@/lib/categories";
import CategoriesDialog from "@/components/CategoriesDialog";

export default async function AdminDashboard() {
  const [postCount, pendingCount, categories] = await Promise.all([
    countPosts(),
    countPendingComments(),
    getCategoriesWithUsage(),
  ]);

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
      {/* Wraps rather than squeezes: on a phone the third button drops to a
          new line instead of overlapping its neighbours. */}
      <div className="admin-dash-actions" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
        <Link href="/posts/new" className="admin-btn">
          + Новая статья
        </Link>
        <Link href="/comments" className="admin-btn-ghost" style={{ padding: "10px 18px", borderRadius: 8 }}>
          Модерация комментариев
        </Link>
        <CategoriesDialog categories={categories} nameMax={CATEGORY_NAME_MAX} />
      </div>
    </>
  );
}
