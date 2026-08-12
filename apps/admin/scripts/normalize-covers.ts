/**
 * One-off, idempotent, in-place: re-crop stored covers to the 3:2 the blog's
 * `.cover-frame` shows them in. Run via `npm run covers:normalize -- <dir>`.
 *
 * Covers used to be stored 3:4 and are now framed 3:2, so every cover that
 * predates that change is cropped a second time in the browser, by
 * `object-fit: cover`, which takes the middle band and drops ~44% of the
 * height. The five markdown-era articles are worse off still: their covers
 * are `/images/*.png` that never went through `saveImage`, so the browser
 * crop is the only one they have ever had.
 *
 * Doing that one crop here instead means it happens once, with the
 * `attention` strategy rather than blindly at the centre, and the reader
 * downloads the pixels that are actually shown.
 *
 * What this cannot do: an image already stored 3:4 lost its top and bottom
 * when it was first uploaded, and those pixels are gone. This makes the
 * remaining crop a good one — it does not bring anything back. A cover that
 * matters should be re-uploaded from the original.
 *
 * Nothing is written without `--apply`; a bare run reports what it would do.
 * Originals are copied to `<dir>/.pre-3x2/` before being overwritten.
 * Filenames and formats are preserved, because `posts.cover` stores the path
 * and nothing here is allowed to invalidate it.
 */
import fs from "fs";
import path from "path";
import sharp, { type Sharp } from "sharp";

const TARGET_RATIO = 3 / 2;
/** Matches the ceiling `saveImage` uses for covers. */
const MAX_WIDTH = 1800;
/** A stored 1800×1200 is 1.5 exactly, but a crop computed from odd source
 * dimensions rounds to something like 1.4993 — close enough that re-cropping
 * it would only re-encode. Anything inside this band counts as done. */
const RATIO_TOLERANCE = 0.01;
const BACKUP_DIRNAME = ".pre-3x2";

const ENCODERS: Record<string, (p: Sharp) => Sharp> = {
  ".webp": (p) => p.webp({ quality: 82 }),
  ".png": (p) => p.png({ compressionLevel: 9 }),
  ".jpg": (p) => p.jpeg({ quality: 82 }),
  ".jpeg": (p) => p.jpeg({ quality: 82 }),
};

/**
 * The largest 3:2 rectangle that fits inside `width`×`height` (`crop`, in
 * source pixels) and the size it is written at (`output`, capped at
 * MAX_WIDTH).
 *
 * Both are reported because they answer different questions and used to be
 * conflated into one misleading percentage: `crop` is how much composition is
 * cut away, `output` merely how many pixels the reader downloads. A 2994×4096
 * source loses 51% of its frame to the crop; going on to write it at 1800 wide
 * costs no composition at all.
 *
 * Derived from the source rather than fixed at 1800×1200 so a small cover is
 * cropped, never enlarged — `saveImage` does upscale, and a blurry cover is
 * its own bug, not one to spread here.
 */
function targetSize(
  width: number,
  height: number
): { crop: { width: number; height: number }; output: { width: number; height: number } } {
  const crop =
    width / height > TARGET_RATIO
      ? { width: Math.round(height * TARGET_RATIO), height }
      : { width, height: Math.round(width / TARGET_RATIO) };

  const output =
    crop.width > MAX_WIDTH
      ? { width: MAX_WIDTH, height: Math.round(MAX_WIDTH / TARGET_RATIO) }
      : crop;

  return { crop, output };
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
}

async function normalize(file: string, apply: boolean): Promise<"done" | "skipped" | "failed"> {
  const ext = path.extname(file).toLowerCase();
  const encode = ENCODERS[ext];
  const name = path.basename(file);

  if (!encode) {
    console.log(`  пропуск  ${name} — формат ${ext || "без расширения"} не обрабатывается`);
    return "skipped";
  }

  const original = await fs.promises.readFile(file);
  const meta = await sharp(original).metadata();
  const animated = (meta.pages ?? 1) > 1;
  // An animated file reports every frame stacked in `height`; the frame's own
  // height is what the crop is about.
  const height = meta.pageHeight ?? meta.height;
  const width = meta.width;

  if (!width || !height) {
    console.log(`  ОШИБКА   ${name} — не удалось прочитать размеры`);
    return "failed";
  }

  const ratio = width / height;
  if (Math.abs(ratio - TARGET_RATIO) < RATIO_TOLERANCE) {
    console.log(`  уже 3:2  ${name} (${width}×${height})`);
    return "skipped";
  }

  const { crop, output } = targetSize(width, height);
  const lost = Math.round((1 - (crop.width * crop.height) / (width * height)) * 100);

  if (!apply) {
    console.log(
      `  ОБРЕЖЕТ  ${name}: ${width}×${height} (${ratio.toFixed(2)}:1) → ` +
        `${output.width}×${output.height}, срезается ~${lost}% кадра` +
        (animated ? " [анимация: кроп по центру]" : "")
    );
    return "done";
  }

  const encoded = await encode(
    sharp(original, { animated }).resize({
      ...output,
      fit: "cover",
      // Same reasoning as `saveImage`: the centre is the wrong guess for a
      // portrait, and sharp rejects the strategy on multi-page input.
      ...(animated ? {} : { position: sharp.strategy.attention }),
    })
  ).toBuffer();

  const backupDir = path.join(path.dirname(file), BACKUP_DIRNAME);
  const backup = path.join(backupDir, name);
  await fs.promises.mkdir(backupDir, { recursive: true });
  // An existing backup is from an earlier run and is closer to the original
  // than what is on disk now — never overwrite it.
  if (!fs.existsSync(backup)) await fs.promises.writeFile(backup, original);

  // Written beside the target and renamed, so a crash cannot leave a
  // half-encoded image at a path an article points to.
  const tmp = `${file}.tmp-${process.pid}`;
  await fs.promises.writeFile(tmp, encoded);
  await fs.promises.rename(tmp, file);

  console.log(
    `  обрезано ${name}: ${width}×${height} → ${output.width}×${output.height}, ` +
      `${formatBytes(original.length)} → ${formatBytes(encoded.length)}` +
      (animated ? " [анимация: кроп по центру]" : "")
  );
  return "done";
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dirs = args.filter((a) => !a.startsWith("--"));

  if (dirs.length === 0) {
    dirs.push(path.join(process.cwd(), "public", "uploads", "covers"));
  }

  if (!apply) {
    console.log("Пробный прогон — ничего не записывается. Добавьте --apply, чтобы применить.\n");
  }

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      console.log(`Каталог не найден, пропускаем: ${dir}`);
      continue;
    }

    console.log(`${dir}:`);
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => path.join(dir, e.name));

    if (files.length === 0) console.log("  (пусто)");

    for (const file of files) {
      const result = await normalize(file, apply);
      if (result === "done") done++;
      else if (result === "skipped") skipped++;
      else failed++;
    }
    console.log("");
  }

  console.log(
    apply
      ? `Готово. Обрезано: ${done}, пропущено: ${skipped}, ошибок: ${failed}. ` +
          `Оригиналы — в ${BACKUP_DIRNAME}/ внутри каждого каталога.`
      : `Итого под обрезку: ${done}, пропущено: ${skipped}, ошибок: ${failed}.`
  );
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
