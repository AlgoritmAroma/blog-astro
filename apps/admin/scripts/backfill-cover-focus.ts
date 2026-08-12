/**
 * One-off, idempotent: fill in what the blog needs to frame a cover well —
 * the file's real dimensions and a focus point — for every article that
 * predates those columns, so old posts frame as well as new ones without
 * anyone opening them in the editor.
 *
 * The dimensions matter more than the focus: the frame's shape is derived
 * from them, and an article without them falls back to a fixed 3:2 that cuts
 * a portrait cover in half. The focus only decides which part survives when
 * the frame genuinely cannot fit the whole picture.
 *
 * Run via `npm run covers:focus` (report only) and `-- --apply` to write.
 *
 * Covers uploaded before this release were cropped to a fixed ratio on the
 * way in and are stored that way; covers uploaded after it are stored whole.
 * Either way the 3:2 frame crops what it gets at display time, and with no
 * focus recorded it crops from the middle — which is the thing that made
 * portraits look beheaded in the first place. This fills in the same guess
 * `saveImage` now makes on upload, using the same `detectFocus`, so a
 * backfilled cover and a freshly uploaded one are framed by identical logic.
 *
 * Nothing is destroyed here: the image files are not touched at all, only the
 * two integer columns. Re-running is safe, and an editor who sets a focus by
 * hand keeps it — only rows where it is still NULL are considered.
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { pool, query } from "../src/lib/db";
import { detectFocus, CENTRE_FOCUS } from "../src/lib/cover-focus";

type Row = { id: number; slug: string; cover: string };

/**
 * Where to look for the file a `cover` path points at.
 *
 * `/uploads/...` is written by this app and sits under its own public dir.
 * `/images/...` belongs to the five markdown-era articles and ships inside
 * the *blog* image, which this container has no copy of — hence a list rather
 * than one root, and a clean "not found" rather than a crash when a cover
 * lives somewhere this process cannot see.
 */
function publicRoots(extra: string[]): string[] {
  return [path.join(process.cwd(), "public"), ...extra];
}

function resolveCover(cover: string, roots: string[]): string | null {
  // `cover` is validated as `/uploads/<kind>/<file>` or `/images/<file>` on
  // save, but this reads whatever is in the database — so the traversal check
  // is repeated rather than assumed.
  if (!cover.startsWith("/") || cover.includes("..")) return null;
  const relative = cover.replace(/^\/+/, "");

  for (const root of roots) {
    const candidate = path.join(root, relative);
    const resolved = path.resolve(candidate);
    if (!resolved.startsWith(path.resolve(root) + path.sep)) continue;
    if (fs.existsSync(resolved)) return resolved;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const extraRoots = args.filter((a) => !a.startsWith("--"));
  const roots = publicRoots(extraRoots);

  if (!apply) {
    console.log("Пробный прогон — в базу ничего не пишется. Добавьте --apply, чтобы применить.\n");
  }
  console.log(`Ищем файлы обложек в: ${roots.join(", ")}\n`);

  const rows = await query<Row>(
    `SELECT id, slug, cover FROM posts
     WHERE cover_focus_x IS NULL OR cover_focus_y IS NULL
        OR cover_width IS NULL OR cover_height IS NULL
     ORDER BY id`
  );

  if (rows.length === 0) {
    console.log("Все обложки уже имеют точку фокуса — делать нечего.");
    return;
  }

  let updated = 0;
  let missing = 0;
  let failed = 0;

  for (const row of rows) {
    const file = resolveCover(row.cover, roots);

    if (!file) {
      // Not fatal: the file simply isn't reachable from this container. Left
      // NULL, which the blog renders as centre — exactly what it does today.
      console.log(`  нет файла  ${row.slug} — ${row.cover} (оставляем по центру)`);
      missing++;
      continue;
    }

    const buffer = await fs.promises.readFile(file);
    const meta = await sharp(buffer).metadata();
    // An animated file stacks its frames in `height`; one frame is the shape
    // the reader sees, so that is the shape the frame has to match.
    const size = { width: meta.width ?? 0, height: meta.pageHeight ?? meta.height ?? 0 };

    if (!size.width || !size.height) {
      console.log(`  ОШИБКА   ${row.slug} — не удалось прочитать размеры ${row.cover}`);
      failed++;
      continue;
    }

    const focus = await detectFocus(buffer, (meta.pages ?? 1) > 1);
    const centred = focus.x === CENTRE_FOCUS.x && focus.y === CENTRE_FOCUS.y;

    if (apply) {
      await query(
        `UPDATE posts SET cover_focus_x = $1, cover_focus_y = $2,
                          cover_width = $3, cover_height = $4
         WHERE id = $5`,
        [focus.x, focus.y, size.width, size.height, row.id]
      );
    }

    console.log(
      `  ${apply ? "записано " : "посчитано"} ${row.slug} → ${size.width}×${size.height}, ` +
        `фокус ${focus.x}% / ${focus.y}%` +
        (centred ? " (совпал с центром)" : "")
    );
    updated++;
  }

  console.log(
    `\n${apply ? "Готово." : "Итого."} Обработано обложек: ${updated}, ` +
      `файл не найден: ${missing}, ошибок: ${failed}.` +
      (missing > 0
        ? "\nНенайденные — это обложки, которых нет в этом контейнере; они остаются по центру."
        : "")
  );
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
