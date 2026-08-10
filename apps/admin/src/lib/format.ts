export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatViews(views: number): string {
  return views.toLocaleString("ru-RU");
}

// Russian picks a different noun form for 1, for 2–4 and for 5–20 — and it
// goes by the last digit, so 21 takes the same form as 1 and 22 the same as 2.
// Intl knows the whole rule; spelling it out by hand would just be a worse
// copy of it.
const pluralRules = new Intl.PluralRules("ru-RU");

/** `pluralRu(3, "минута", "минуты", "минут")` → "минуты". */
export function pluralRu(count: number, one: string, few: string, many: string): string {
  switch (pluralRules.select(count)) {
    case "one":
      return one;
    case "few":
      return few;
    default:
      return many;
  }
}

/** "1 минута" / "3 минуты" / "5 минут". */
export function formatReadingTime(minutes: number): string {
  return `${minutes} ${pluralRu(minutes, "минута", "минуты", "минут")}`;
}
