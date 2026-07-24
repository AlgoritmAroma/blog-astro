import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { logoutAction } from "../login/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth beyond src/middleware.ts — this re-check runs in the
  // Node runtime and doesn't rely on the middleware matcher config staying
  // correct forever.
  const session = await getSession();
  if (!session.admin) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/admin" style={{ fontWeight: 700 }}>
          Админка блога
        </Link>
        <nav>
          <Link href="/admin/posts">Статьи</Link>
          <Link href="/admin/comments">Комментарии</Link>
          <Link href="/" target="_blank">
            Открыть блог ↗
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="admin-btn-ghost"
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.85rem" }}
            >
              Выйти
            </button>
          </form>
        </nav>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
