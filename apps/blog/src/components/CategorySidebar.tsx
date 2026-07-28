import { ALL_CATEGORIES } from "@/lib/blog";

export default function CategorySidebar({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (category: string | null) => void;
}) {
  return (
    <aside className="category-sidebar">
      <h2 className="category-sidebar__title">Рубрики</h2>
      <ul className="category-sidebar__list">
        <li>
          <button
            type="button"
            className={`category-sidebar__link${!active ? " is-active" : ""}`}
            onClick={() => onSelect(null)}
          >
            Все статьи
          </button>
        </li>
        {ALL_CATEGORIES.map((category) => (
          <li key={category}>
            <button
              type="button"
              className={`category-sidebar__link${active === category ? " is-active" : ""}`}
              onClick={() => onSelect(category)}
            >
              {category}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
