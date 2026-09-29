import { CATEGORY_NAME_MAX, getCategoriesWithUsage, type CategoryWithUsage } from "@/lib/categories";
import ConfirmButton from "@/components/ConfirmButton";
import CategoryEditForm from "./CategoryEditForm";
import { deleteCategoryAction } from "./actions";

/** Russian plural for "статья": 1 статья, 2 статьи, 5 статей. */
function articles(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} статья`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} статьи`;
  return `${n} статей`;
}

function deleteConfirmText(c: CategoryWithUsage): string {
  if (c.postCount === 0) return `Удалить рубрику «${c.name}»? Статей в ней нет.`;
  const sole = c.soleCount
    ? ` Из них ${articles(c.soleCount)} останется без рубрики — они будут видны на сайте только в «Все».`
    : "";
  return (
    `Удалить рубрику «${c.name}»? К ней привязано: ${articles(c.postCount)}. ` +
    `Сами статьи не удаляются — рубрика просто будет убрана из них.${sole}`
  );
}

export default async function AdminCategoriesPage() {
  const categories = await getCategoriesWithUsage();

  return (
    <>
      <h1 style={{ marginBottom: 8 }}>Рубрики</h1>
      <p className="admin-hint" style={{ marginBottom: 20 }}>
        Переименование сразу меняет рубрику во всех статьях. Порядок — место в списке рубрик на сайте:
        меньше число — выше.
      </p>

      <div className="admin-card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Название и порядок</th>
              <th>Статей</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>
                  {/* Keyed on the stored values so a save elsewhere (or a
                      rename that normalised the spelling) resets the inputs. */}
                  <CategoryEditForm
                    key={`${c.name}|${c.sort_order}`}
                    id={c.id}
                    name={c.name}
                    sortOrder={c.sort_order}
                    maxLength={CATEGORY_NAME_MAX}
                  />
                </td>
                <td>
                  {c.postCount}
                  {c.soleCount > 0 && (
                    <div className="admin-hint">единственная у {c.soleCount}</div>
                  )}
                </td>
                <td>
                  <form action={deleteCategoryAction.bind(null, c.id)}>
                    <ConfirmButton
                      className="admin-btn-danger"
                      confirmText={deleteConfirmText(c)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 8,
                        fontSize: "0.85rem",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        fontWeight: 700,
                      }}
                    >
                      Удалить
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} style={{ opacity: 0.6 }}>
                  Рубрик пока нет — они создаются в форме статьи.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
