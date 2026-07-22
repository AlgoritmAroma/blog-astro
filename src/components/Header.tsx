import Link from "next/link";

const MAIN_SITE = "https://aiastro.ru";

const NAV_LINKS = [
  { label: "Натальная карта", href: `${MAIN_SITE}/natal` },
  { label: "Прогнозы", href: `${MAIN_SITE}/prediction` },
  { label: "Совместимость", href: `${MAIN_SITE}/compatibility` },
  { label: "Ответы на вопросы", href: `${MAIN_SITE}/answers` },
  { label: "Блог", href: "/", internal: true },
];

export default function Header() {
  return (
    <header className="site-header">
      <a href={MAIN_SITE} style={{ flexShrink: 0 }}>
        <h3 style={{ fontSize: "var(--h3)" }}>ASTRO AI</h3>
      </a>

      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 28,
          flexWrap: "wrap",
        }}
      >
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

      <a href={`${MAIN_SITE}/login`} className="btn" style={{ flexShrink: 0 }}>
        Войти
      </a>
    </header>
  );
}
