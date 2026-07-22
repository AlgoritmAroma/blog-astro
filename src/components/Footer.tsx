const MAIN_SITE = "https://aiastro.ru";

export default function Footer() {
  return (
    <footer
      style={{
        background: "var(--black)",
        borderTop: "1px solid rgba(184,132,76,0.18)",
        padding: "48px 0",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div>
          <h3
            style={{
              fontFamily: "var(--font-anticva), serif",
              color: "var(--orange)",
              fontSize: "1.3rem",
              marginBottom: 10,
            }}
          >
            ASTRO AI
          </h3>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>ИП Кизимов Константин Юрьевич</p>
          <p style={{ fontSize: "0.85rem", opacity: 0.6 }}>ИНН 782010196677</p>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: "0.85rem",
            opacity: 0.75,
          }}
        >
          <a href={`${MAIN_SITE}/privacy-policy`}>Политика конфиденциальности</a>
          <a href={`${MAIN_SITE}/personal-data-policy`}>Политика персональных данных</a>
        </div>

        <a href={`${MAIN_SITE}/offer`} style={{ fontSize: "0.85rem", opacity: 0.75 }}>
          Публичный договор-оферта
        </a>

        <a href="mailto:info@aiastro.ru" style={{ fontSize: "0.85rem", color: "var(--orange)" }}>
          info@aiastro.ru
        </a>
      </div>
    </footer>
  );
}
