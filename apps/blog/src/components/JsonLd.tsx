/**
 * One `<script type="application/ld+json">`.
 *
 * `<` is written as `<`: JSON.stringify leaves it alone, and a title or
 * an FAQ answer containing `</script>` would otherwise close the tag and spill
 * the rest of the JSON into the page as markup. The escape is plain JSON, so
 * a parser reads back the very same string.
 */
export default function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
