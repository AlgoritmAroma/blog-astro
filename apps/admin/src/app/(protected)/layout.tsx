import Link from "next/link";
import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import { getSession } from "@/lib/session";
import { logoutAction } from "../login/actions";

/**
 * The admin shell — header, tab bar, page frame.
 *
 * Every page of the panel except the login form lives under this route group,
 * so every one of them gets the header (and the auth re-check below). Route
 * groups don't show up in the URL: `/posts` and `/comments` are still
 * `/posts` and `/comments`. They used to sit *outside* the group, which meant
 * they rendered with no header, no tabs and no way back to the dashboard
 * other than the browser's own Back button — and they leaned on the
 * middleware alone for their auth.
 */
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
        <Link href="/" className="admin-brand">
          Админка блога
        </Link>
        <div className="admin-header-right">
          <AdminNav blogUrl={blogUrl} />
          <form action={logoutAction}>
            <button
              type="submit"
              className="admin-btn-ghost"
              style={{ padding: "6px 14px", borderRadius: 8, fontSize: "0.85rem" }}
            >
              Выйти
            </button>
          </form>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
