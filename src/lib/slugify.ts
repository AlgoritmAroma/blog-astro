const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
  с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

/** Transliterates Cyrillic to Latin and slugifies — matches the convention
 * already used by the migrated posts (e.g. "Что такое натальная карта" →
 * "chto-takoe-natalnaya-karta"). */
export function slugify(input: string): string {
  const transliterated = input
    .toLowerCase()
    // "ый" transliterates letter-by-letter to "yy" (ы→y, й→y) — collapse it
    // to a single "y", matching the convention of the already-migrated posts
    // (e.g. "retrogradny", not "retrogradnyy").
    .replace(/ый/g, "y")
    .split("")
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("");

  return transliterated
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
