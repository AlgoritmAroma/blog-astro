"use client";

import Link from "next/link";
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

  const navLinks: { label: string; href: string; internal?: boolean }[] = [
    ...MAIN_SITE_SECTIONS.map((section) => ({
      label: section.label,
      href: sectionHref(mainSite, section.path, signedIn),
    })),
    { label: "Блог", href: "/", internal: true },
  ];
  const account = accountLink(mainSite, signedIn);

  return (
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
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
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
        </div>
      )}
    </header>
  );
}
