import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { formatDate, formatViews } from "@/lib/format";
import { deletePostAction } from "./actions";
import ConfirmButton from "@/components/ConfirmButton";

export default async function AdminPostsPage() {
  const posts = await getAllPosts();

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1>Статьи</h1>
        <Link href="/posts/new" className="admin-btn">
          + Новая статья
        </Link>
      </div>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Заголовок</th>
              <th>Категория</th>
              <th>Дата</th>
              <th>Просмотры</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td>{post.category}</td>
                <td>{formatDate(post.date)}</td>
                <td>{formatViews(post.views)}</td>
                <td>
                  <div className="admin-row-actions">
                    <Link
                      href={`/posts/${post.id}/edit`}
                      className="admin-btn-ghost"
                      style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.85rem" }}
                    >
                      Править
                    </Link>
                    <form action={deletePostAction.bind(null, post.id)}>
                      <ConfirmButton
                        className="admin-btn-danger"
                        confirmText={`Удалить статью «${post.title}»? Это необратимо.`}
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
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} style={{ opacity: 0.6 }}>
                  Пока нет статей.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
