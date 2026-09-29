"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The admin's tab bar.
 *
 * It is a client component only so it can mark the open tab: `usePathname`
 * is the one thing here the server can't tell us, and without it every tab
 * looked identical whichever page you were on. A sub-page (`/posts/new`,
 * `/posts/12/edit`) lights up its section's tab, so the tab doubles as the
 * way back out of a form.
 */
const TABS = [
  { href: "/", label: "Дашборд" },
  { href: "/posts", label: "Статьи" },
  { href: "/comments", label: "Комментарии" },
  { href: "/categories", label: "Рубрики" },
];

export default function AdminNav({ blogUrl }: { blogUrl: string }) {
  const pathname = usePathname();

  return (
    <nav className="admin-nav">
      {TABS.map((tab) => {
        const active =
          tab.href === "/" ? pathname === "/" : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`admin-nav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
      <a href={blogUrl} target="_blank" rel="noopener" className="admin-nav-link">
        Открыть блог ↗
      </a>
    </nav>
  );
}
