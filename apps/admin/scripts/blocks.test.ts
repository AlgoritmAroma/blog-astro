// Unit tests for the article-block sanitizer. This is the one module in the
// admin whose output is injected into the *public* blog via
// dangerouslySetInnerHTML, so it gets real tests. Run: npm run test:blocks
import assert from "node:assert/strict";
import {
  sanitizeInlineHtml,
  stripInlineHtml,
  parseBlocks,
  blocksToPlainText,
  isUploadPath,
  isCoverPath,
  markdownToBlocks,
} from "../src/lib/blocks";

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failures++;
    console.error(`FAIL  ${name}\n      ${(err as Error).message.split("\n")[0]}`);
  }
}

console.log("sanitizeInlineHtml — allowed formatting");
check("keeps bold/italic and normalises b/i", () => {
  assert.equal(sanitizeInlineHtml("<b>жирный</b> и <i>курсив</i>"), "<strong>жирный</strong> и <em>курсив</em>");
  assert.equal(sanitizeInlineHtml("<strong>a</strong><em>b</em><u>c</u><s>d</s>"), "<strong>a</strong><em>b</em><u>c</u><s>d</s>");
});
check("keeps <br>", () => {
  assert.equal(sanitizeInlineHtml("a<br>b<br />c"), "a<br />b<br />c");
});
check("keeps safe links and forces rel/target", () => {
  assert.equal(
    sanitizeInlineHtml('<a href="https://aiastro.ru/x">тут</a>'),
    '<a href="https://aiastro.ru/x" target="_blank" rel="noopener noreferrer">тут</a>'
  );
  assert.match(sanitizeInlineHtml('<a href="/blog/abc">x</a>'), /href="\/blog\/abc"/);
  assert.match(sanitizeInlineHtml('<a href="mailto:a@b.ru">x</a>'), /href="mailto:a@b\.ru"/);
});

console.log("sanitizeInlineHtml — XSS");
check("drops script tags but keeps their text escaped", () => {
  const out = sanitizeInlineHtml('<script>alert(1)</script>');
  assert.ok(!out.includes("<script"), out);
  assert.equal(out, "alert(1)");
});
check("drops img/svg/iframe and event handlers", () => {
  for (const payload of [
    '<img src=x onerror="alert(1)">',
    '<svg/onload=alert(1)>',
    '<iframe src="//evil"></iframe>',
    '<body onload=alert(1)>',
  ]) {
    const out = sanitizeInlineHtml(payload);
    assert.ok(!/[<]/.test(out.replace(/<\/?(strong|em|u|s|br|a)\b[^>]*>/g, "")), `${payload} -> ${out}`);
    assert.ok(!/onerror|onload/i.test(out), `${payload} -> ${out}`);
  }
});
check("strips attributes from allowed tags", () => {
  const out = sanitizeInlineHtml('<strong style="position:fixed" onclick="alert(1)">x</strong>');
  assert.equal(out, "<strong>x</strong>");
});
check("rejects javascript: and data: hrefs, keeping the link text", () => {
  for (const bad of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    ' javascript:alert(1)',
    'data:text/html;base64,PHN2Zz4=',
    'vbscript:msgbox(1)',
  ]) {
    const out = sanitizeInlineHtml(`<a href="${bad}">клик</a>`);
    assert.equal(out, "клик", `${bad} -> ${out}`);
  }
});
check("cannot break out of the href attribute", () => {
  const out = sanitizeInlineHtml('<a href="https://a.ru/&quot; onmouseover=&quot;alert(1)">x</a>');
  assert.ok(!/onmouseover/.test(out.replace(/&quot;|&#39;/g, "")) || !out.includes('" on'), out);
  assert.ok(out.startsWith('<a href="https://a.ru/'), out);
  // the injected quote must survive only in escaped form
  assert.ok(!/href="[^"]*"\s+on/i.test(out), out);
});

console.log("sanitizeInlineHtml — structure");
check("escapes stray angle brackets and ampersands", () => {
  assert.equal(sanitizeInlineHtml("5 < 7 & 8 > 6"), "5 &lt; 7 &amp; 8 &gt; 6");
});
check("closes unbalanced tags so formatting can't leak", () => {
  assert.equal(sanitizeInlineHtml("<strong>висит"), "<strong>висит</strong>");
  assert.equal(sanitizeInlineHtml("текст</strong>"), "текст");
});
check("repairs interleaved tags", () => {
  assert.equal(sanitizeInlineHtml("<strong><em>x</strong>y</em>"), "<strong><em>x</em></strong><em>y</em>");
});
check("is idempotent — re-saving an article must not rot its text", () => {
  // The editor round-trip runs the output back through: stored `&lt;` comes
  // out of contentEditable as `&lt;` and must not become `&amp;lt;`.
  for (const input of [
    '<b>ж</b> <a href="https://a.ru">л</a> 5 < 7',
    "цена < 100 & выше",
    "a &amp; b &lt;tag&gt; &#39;q&#39; &nbsp;x",
    '<a href="https://a.ru/?x=1&amp;y=2">ссылка</a>',
  ]) {
    const once = sanitizeInlineHtml(input);
    assert.equal(sanitizeInlineHtml(once), once, `${input} -> ${once}`);
    assert.equal(sanitizeInlineHtml(sanitizeInlineHtml(once)), once);
  }
});
check("pre-encoded tag entities stay inert text, not markup", () => {
  const out = sanitizeInlineHtml("&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.ok(!out.includes("<script"), out);
  assert.equal(stripInlineHtml(out), "<script>alert(1)</script>");
});
check("a bare ampersand still gets escaped", () => {
  assert.equal(sanitizeInlineHtml("Иванов & Ко"), "Иванов &amp; Ко");
  assert.equal(sanitizeInlineHtml("&notarealentity"), "&amp;notarealentity");
});

console.log("stripInlineHtml / isUploadPath");
check("strips tags to plain text", () => {
  assert.equal(stripInlineHtml("<strong>а</strong> б<br>в"), "а б в");
  assert.equal(stripInlineHtml("5 &lt; 7"), "5 < 7");
});
check("only accepts our own upload paths", () => {
  assert.ok(isUploadPath("/uploads/covers/a-1.webp"));
  assert.ok(isUploadPath("/uploads/content/a-1.webp"));
  assert.ok(!isUploadPath("https://evil.ru/x.png"));
  assert.ok(!isUploadPath("/uploads/../../etc/passwd"));
  assert.ok(!isUploadPath("/etc/passwd"));
});
check("covers also accept the migrated /images paths", () => {
  // The five markdown-era articles have covers like /images/natal.png; saving
  // one from the editor must not be rejected over a field nobody touched.
  assert.ok(isCoverPath("/images/natal.png"));
  assert.ok(isCoverPath("/uploads/covers/a-1.webp"));
  assert.ok(!isCoverPath("https://evil.ru/x.png"));
  assert.ok(!isCoverPath("/images/../../etc/passwd"));
  assert.ok(!isCoverPath("/etc/passwd"));
});

console.log("parseBlocks");
check("keeps valid blocks and drops junk", () => {
  const blocks = parseBlocks([
    { type: "heading", level: 2, text: "<b>Подглава</b>", align: "center" },
    { type: "paragraph", html: "<b>ж</b>ирный", align: "nonsense" },
    { type: "list", ordered: true, items: ["раз", "", "два"] },
    { type: "image", src: "/uploads/content/x.webp", alt: "альт", caption: "" },
    { type: "image", src: "https://evil.ru/x.png", alt: "", caption: "" },
    { type: "faq", items: [{ q: "Вопрос?", a: "Ответ" }, { q: "", a: "х" }] },
    { type: "paragraph", html: "   ", align: "left" },
    { type: "unknown" },
    null,
  ]);
  assert.equal(blocks.length, 5);
  assert.equal(blocks[0].type === "heading" && blocks[0].text, "Подглава");
  assert.equal(blocks[0].type === "heading" && blocks[0].align, "center");
  assert.equal(blocks[1].type === "paragraph" && blocks[1].align, "left");
  assert.deepEqual(blocks[2].type === "list" && blocks[2].items, ["раз", "два"]);
  assert.equal(blocks[3].type === "image" && blocks[3].src, "/uploads/content/x.webp");
  assert.equal(blocks[4].type === "faq" && blocks[4].items.length, 1);
});
check("survives non-array and hostile input", () => {
  assert.deepEqual(parseBlocks(null), []);
  assert.deepEqual(parseBlocks("nope"), []);
  assert.deepEqual(parseBlocks([{ type: "paragraph", html: "<script>alert(1)</script>", align: "left" }])[0], {
    type: "paragraph",
    html: "alert(1)",
    align: "left",
  });
});
check("flattens to plain text", () => {
  const text = blocksToPlainText(
    parseBlocks([
      { type: "heading", level: 2, text: "Заголовок", align: "left" },
      { type: "paragraph", html: "<strong>текст</strong>", align: "left" },
      { type: "faq", items: [{ q: "В?", a: "О" }] },
    ])
  );
  assert.equal(text, "Заголовок\n\nтекст\n\nВ? О");
});

console.log("markdownToBlocks (legacy article import)");
check("converts the constructs the migrated articles actually use", () => {
  const blocks = markdownToBlocks(
    [
      "Вводный абзац с **жирным** и [ссылкой](https://aiastro.ru).",
      "",
      "## Из чего состоит карта",
      "",
      "- **Планеты** — сферы жизни",
      "- Знаки зодиака",
      "",
      "### Подзаголовок",
      "",
      "1. Первый шаг",
      "2. Второй шаг",
      "",
      "> Карта описывает потенциал,",
      "> а не приговор.",
      "",
      "Финальный абзац.",
    ].join("\n")
  );

  assert.deepEqual(
    blocks.map((b) => b.type),
    ["paragraph", "heading", "list", "heading", "list", "quote", "paragraph"]
  );
  assert.match(blocks[0].type === "paragraph" ? blocks[0].html : "", /<strong>жирным<\/strong>/);
  assert.match(blocks[0].type === "paragraph" ? blocks[0].html : "", /<a href="https:\/\/aiastro\.ru"/);
  assert.equal(blocks[1].type === "heading" && blocks[1].level, 2);
  assert.equal(blocks[3].type === "heading" && blocks[3].level, 3);
  assert.equal(blocks[2].type === "list" && blocks[2].ordered, false);
  assert.deepEqual(blocks[4].type === "list" && blocks[4].items, ["Первый шаг", "Второй шаг"]);
  assert.equal(blocks[5].type === "quote" && blocks[5].html, "Карта описывает потенциал, а не приговор.");
});
check("markdown headings keep plain text, not markup", () => {
  const blocks = markdownToBlocks("## Заголовок с **жирным**");
  assert.equal(blocks[0].type === "heading" && blocks[0].text, "Заголовок с жирным");
});
check("markdown cannot smuggle html through", () => {
  const blocks = markdownToBlocks('Текст <script>alert(1)</script> и [x](javascript:alert(1))');
  const html = blocks[0].type === "paragraph" ? blocks[0].html : "";
  assert.ok(!html.includes("<script"), html);
  assert.ok(!/javascript:/i.test(html), html);
});
check("empty markdown yields no blocks", () => {
  assert.deepEqual(markdownToBlocks(""), []);
  assert.deepEqual(markdownToBlocks("\n\n   \n"), []);
});

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log("\nall block tests passed");
