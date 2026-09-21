"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MAIN_SITE_SECTIONS, accountLink, sectionHref } from "@/lib/main-site-links";

export default function Header({
  mainSite,
  signedIn,
}: {
  mainSite: string;
  signedIn: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // Escape closes it, the way every other overlay on the web does.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  // The blog's own links are client-side navigations, and so are the back and
  // forward buttons: without this the menu would stay open on top of the page
  // it just left. Adjusted during render rather than in an effect — React
  // then re-renders with the menu closed before anything is painted, instead
  // of showing it over the new page for a frame.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const navLinks: { label: string; href: string; internal?: boolean }[] = [
    ...MAIN_SITE_SECTIONS.map((section) => ({
      label: section.label,
      href: sectionHref(mainSite, section.path, signedIn),
    })),
    { label: "Блог", href: "/", internal: true },
  ];
  const account = accountLink(mainSite, signedIn);

  return (
    <>
      <header className={`site-header${scrolled || menuOpen ? " is-scrolled" : ""}`}>
        <a href={mainSite} style={{ flexShrink: 0 }}>
          <h3 style={{ fontSize: "var(--h3)" }}>ASTRO AI</h3>
        </a>

        <nav className="site-nav">
          {navLinks.map((link) =>
            link.internal ? (
              <Link
                key={link.href}
                href={link.href}
                className="nav-link blog-link is-active"
              >
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className="nav-link ext-link">
                {link.label}
              </a>
            )
          )}
        </nav>

        <div className="header-actions">
          <a href={account.href} className="btn">
            {account.label}
          </a>
          <button
            type="button"
            className={`mobile-menu-btn${menuOpen ? " is-open" : ""}`}
            aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {menuOpen && (
        <>
          {/* Dims the page under the menu — the panel is dark on a dark hero
              and had nothing to separate it from the page behind — and is
              what a tap outside the menu lands on, which is how a reader
              expects to close it. */}
          <div
            className="mobile-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <nav className="mobile-menu" id="mobile-menu" aria-label="Меню">
            {navLinks.map((link) =>
              link.internal ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mobile-menu-link is-active"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.href}
                  href={link.href}
                  className="mobile-menu-link"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              )
            )}
            {/* Below 440px the login button shrinks to fit beside the burger;
                repeating it here gives it a full-width target. */}
            <a
              href={account.href}
              className="mobile-menu-link mobile-menu-account"
              onClick={() => setMenuOpen(false)}
            >
              {account.label}
            </a>
          </nav>
        </>
      )}
    </>
  );
}
