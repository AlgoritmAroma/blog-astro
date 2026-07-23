"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const MAIN_SITE = "https://aiastro.ru";

const NAV_LINKS = [
  { label: "Натальная карта", href: `${MAIN_SITE}/natal` },
  { label: "Прогнозы", href: `${MAIN_SITE}/prediction` },
  { label: "Совместимость", href: `${MAIN_SITE}/compatibility` },
  { label: "Ответы на вопросы", href: `${MAIN_SITE}/answers` },
  { label: "Блог", href: "/", internal: true },
];

export default function Header() {
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

  return (
    <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
      <a href={MAIN_SITE} style={{ flexShrink: 0 }}>
        <h3 style={{ fontSize: "var(--h3)" }}>ASTRO AI</h3>
      </a>

      <nav className="site-nav">
        {NAV_LINKS.map((link) =>
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
        <a href={`${MAIN_SITE}/login`} className="btn">
          Войти
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
          {NAV_LINKS.map((link) =>
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
