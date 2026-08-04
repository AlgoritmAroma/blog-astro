"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Makes the article editor exitable — and hard to exit by accident.
 *
 * The page previously had no way out at all: no back link, no cancel. This
 * adds both, and guards every route away from a half-written article with a
 * confirmation step. Three exits have to be covered:
 *
 *  - the back/cancel buttons rendered here,
 *  - the admin header's own links (caught by a capture-phase click listener,
 *    since the App Router has no supported route-change blocker),
 *  - closing the tab or hitting the browser's back button (`beforeunload`,
 *    which can only show the browser's own generic dialog).
 */
export default function LeaveGuard({
  dirty,
  backHref,
  className,
}: {
  dirty: boolean;
  backHref: string;
  className?: string;
}) {
  const router = useRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;

    const handler = (event: MouseEvent) => {
      // Leave modified clicks alone — those open a new tab and don't take the
      // editor anywhere.
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      event.preventDefault();
      event.stopPropagation();
      setPendingHref(url.pathname + url.search);
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [dirty]);

  function leave(href: string) {
    if (!dirty) {
      router.push(href);
      return;
    }
    setPendingHref(href);
  }

  return (
    <>
      <div className={className}>
        <button type="button" className="admin-btn-ghost" onClick={() => leave(backHref)}>
          ← К списку статей
        </button>
      </div>

      {pendingHref && (
        <div
          className="admin-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-guard-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPendingHref(null);
          }}
        >
          <div className="admin-modal">
            <h2 id="leave-guard-title" className="admin-modal-title">
              Выйти без сохранения?
            </h2>
            <p className="admin-modal-text">
              Статья не сохранена. Черновик останется в этом браузере, и его можно будет
              восстановить, когда вы вернётесь на эту страницу.
            </p>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn" onClick={() => setPendingHref(null)} autoFocus>
                Остаться
              </button>
              <button
                type="button"
                className="admin-btn-ghost"
                onClick={() => {
                  const href = pendingHref;
                  setPendingHref(null);
                  router.push(href);
                }}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
