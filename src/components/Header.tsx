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
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(18,18,18,0.85)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(184,132,76,0.18)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "var(--header-height)",
          gap: 24,
        }}
      >
        <a href={MAIN_SITE} style={{ flexShrink: 0 }}>
          <h3
            style={{
              fontFamily: "var(--font-anticva), serif",
              color: "var(--orange)",
              fontSize: "1.4rem",
              letterSpacing: "0.06em",
            }}
          >
            ASTRO AI
          </h3>
        </a>

        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            flexWrap: "wrap",
          }}
          className="nav-bar"
        >
          {NAV_LINKS.map((link) =>
            link.internal ? (
              <Link
                key={link.href}
                href={link.href}
                className="blog-link"
                style={{
                  fontSize: "0.95rem",
                  color: "var(--orange)",
                  fontWeight: 700,
                  borderBottom: "1px solid var(--orange)",
                  paddingBottom: 2,
                }}
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className="ext-link"
                style={{ fontSize: "0.95rem", color: "var(--beige-bg)", opacity: 0.85 }}
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        <a href={`${MAIN_SITE}/login`} className="btn btn-sm" style={{ flexShrink: 0 }}>
          Войти
        </a>
      </div>
    </header>
  );
}
