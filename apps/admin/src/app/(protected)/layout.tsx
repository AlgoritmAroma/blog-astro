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
    redirect("/login");
  }

  // Admin is a separate app/deploy from the public blog (different
  // subdomain), so this can no longer be a relative "/" link.
  const blogUrl = process.env.NEXT_PUBLIC_BLOG_URL ?? "https://aiastro.ru";

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <Link href="/" style={{ fontWeight: 700 }}>
          Админка блога
        </Link>
        <nav>
          <Link href="/posts">Статьи</Link>
          <Link href="/comments">Комментарии</Link>
          <Link href={blogUrl} target="_blank">
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
