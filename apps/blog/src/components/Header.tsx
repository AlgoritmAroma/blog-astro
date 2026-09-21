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
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
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
            {menuOpen ? <CloseIcon /> : <BurgerIcon />}
          </button>
        </div>
      </header>

      {/* The menu covers the screen, so a click anywhere in it closes —
          whether it landed on a section or on the empty sky between them.
          The account button stays in the header above, where the main site
          keeps it too, rather than being repeated in the list. */}
      {menuOpen && (
        <nav
          className="mobile-menu"
          id="mobile-menu"
          aria-label="Меню"
          onClick={() => setMenuOpen(false)}
        >
          {navLinks.map((link) =>
            link.internal ? (
              <Link key={link.href} href={link.href} className="mobile-menu-link is-active">
                {link.label}
              </Link>
            ) : (
              <a key={link.href} href={link.href} className="mobile-menu-link">
                {link.label}
              </a>
            )
          )}
        </nav>
      )}
    </>
  );
}

/**
 * The burger and the close cross, copied path-for-path from the main site so
 * the two headers carry the same control. The bars are deliberately unequal
 * and right-aligned — 14px, 22px, 15px top to bottom — which is what makes it
 * read as that site's mark rather than a generic three-line icon.
 */
function BurgerIcon() {
  return (
    <svg width="23" height="19" viewBox="0 0 23 19" fill="none" aria-hidden="true">
      <path
        d="M8.9375 2.5H22.0625C22.304 2.5 22.5 2.053 22.5 1.5C22.5 0.947 22.304 0.5 22.0625 0.5H8.9375C8.696 0.5 8.5 0.947 8.5 1.5C8.5 2.053 8.69556 2.5 8.9375 2.5Z"
        fill="currentColor"
      />
      <path
        d="M1.1875 10.5H21.8125C22.192 10.5 22.5 10.053 22.5 9.5C22.5 8.947 22.192 8.5 21.8125 8.5H1.1875C0.808 8.5 0.5 8.947 0.5 9.5C0.5 10.053 0.807313 10.5 1.1875 10.5Z"
        fill="currentColor"
      />
      <path
        d="M7.96875 18.5H22.0312C22.29 18.5 22.5 18.053 22.5 17.5C22.5 16.947 22.29 16.5 22.0312 16.5H7.96875C7.71 16.5 7.5 16.947 7.5 17.5C7.5 18.053 7.70953 18.5 7.96875 18.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 23 23" fill="none" aria-hidden="true">
      <path d="M17.1583 5.84262L5.84456 17.1563" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M5.84457 5.84247L17.1583 17.1562" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
