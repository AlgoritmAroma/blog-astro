const MAIN_SITE = "https://aiastro.ru";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <h3>Астро AI</h3>
      </div>

      <div className="footer-bottom">
        <div className="footer-links">
          <div className="footer-link-area">
            <p>ИП Кизимов Константин Юрьевич</p>
            <p>ИНН 782010196677</p>
          </div>

          <div className="footer-link-area">
            <a href={`${MAIN_SITE}/rules/privacy-policy`}>Политика конфиденциальности</a>
            <a href={`${MAIN_SITE}/rules/personal-data-policy`}>Политика персональных данных</a>
          </div>

          <div className="footer-link-area">
            <a href={`${MAIN_SITE}/rules/oferta`}>Публичный договор-оферта</a>
          </div>
        </div>

        <a href="mailto:info@aiastro.ru" className="footer-email">
          info@aiastro.ru
        </a>
      </div>
    </footer>
  );
}
