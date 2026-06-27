// prologue-gallery ビルドスクリプト（依存ゼロ・Node 標準のみ）。
// versions.json を読み、各版の静的ビルドを out/<id>/ へ集約し、
// 一覧トップ out/index.html を生成する。GitHub Actions から実行される。
//
// 各版（versions/<id>/）は、その版の basePath を /prologue-gallery/<id> として
// 事前ビルド・vendor 済みである前提。ここではビルドせず収集のみ行う。

import { readFile, mkdir, cp, rm, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const OUT = join(root, "out");

const exists = async (p) =>
  access(p).then(
    () => true,
    () => false,
  );

const esc = (s = "") =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// ツールごとの識別色（minimal トークン: Claude=near-black, Codex=indigo）。
const TOOL = {
  Claude: { fg: "#ffffff", bg: "#0c0c09" },
  Codex: { fg: "#ffffff", bg: "#312c85" },
};
const toolChip = (tool) => {
  const c = TOOL[tool] ?? { fg: "#ffffff", bg: "#4b5563" };
  return `<span class="chip" style="--chip-fg:${c.fg};--chip-bg:${c.bg}">${esc(tool)}</span>`;
};

function card(base, v) {
  const href = `${base}/${esc(v.id)}/`;
  const thumb = v.thumb
    ? `<img class="thumb" src="${base}/${esc(v.thumb)}" alt="${esc(v.title)} のプレビュー" loading="lazy" />`
    : `<div class="thumb thumb--empty"><span>No preview</span></div>`;
  return `
  <li class="card">
    <a class="card__media" href="${href}">${thumb}</a>
    <div class="card__body">
      <div class="card__meta">
        <code class="vid">${esc(v.id)}</code>
        ${toolChip(v.tool)}
      </div>
      <h2 class="card__title"><a href="${href}">${esc(v.title)}</a></h2>
      <p class="card__note">${esc(v.note ?? "")}</p>
      <dl class="card__facts">
        <div><dt>Stack</dt><dd>${esc(v.stack ?? "—")}</dd></div>
        <div><dt>Author</dt><dd>${esc(v.author ?? "—")}</dd></div>
        <div><dt>Date</dt><dd>${esc(v.date ?? "—")}</dd></div>
      </dl>
      <a class="card__cta" href="${href}">プレビューを開く <span aria-hidden="true">→</span></a>
    </div>
  </li>`;
}

function page(data) {
  const base = data.basePath ?? "";
  const cards = (data.versions ?? []).map((v) => card(base, v)).join("\n");
  const empty = `<li class="empty">まだ登録された版がないのじゃ。versions.json に追加して再ビルドするのじゃ。</li>`;
  const count = (data.versions ?? []).length;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${esc(data.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inconsolata:wght@400;500;600&display=swap" rel="stylesheet" />
<style>
:root{
  --ink:#0c0c09; --surface:#f4f4f1; --paper:#ffffff;
  --line:#e3e3df; --muted:#6b6b66; --indigo:#312c85;
  --r:14px;
  --sans:'Inter',system-ui,-apple-system,'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;
  --mono:'Inconsolata',ui-monospace,SFMono-Regular,Menlo,monospace;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--surface);color:var(--ink);font-family:var(--sans);line-height:1.6;
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:inherit}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
/* header */
.masthead{padding:64px 0 32px;border-bottom:1px solid var(--line)}
.eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin:0 0 16px}
.masthead h1{font-size:clamp(28px,5vw,46px);line-height:1.08;font-weight:800;letter-spacing:-.02em;margin:0 0 12px}
.masthead p{max-width:62ch;margin:0;color:var(--muted);font-size:16px}
.count{display:inline-block;margin-top:20px;font-family:var(--mono);font-size:12px;color:var(--muted)}
/* grid */
.grid{list-style:none;margin:40px 0 0;padding:0;display:grid;gap:24px;
  grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.card{background:var(--paper);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;
  display:flex;flex-direction:column;transition:border-color .15s ease, transform .15s ease, box-shadow .15s ease}
.card:hover{border-color:var(--ink);transform:translateY(-2px);box-shadow:0 8px 24px rgba(12,12,9,.07)}
.card__media{display:block;aspect-ratio:16/10;background:var(--surface);overflow:hidden}
.thumb{width:100%;height:100%;object-fit:cover;object-position:top center;display:block}
.thumb--empty{display:flex;align-items:center;justify-content:center;height:100%;
  color:var(--muted);font-family:var(--mono);font-size:13px;border-bottom:1px solid var(--line)}
.card__body{padding:20px;display:flex;flex-direction:column;gap:12px;flex:1}
.card__meta{display:flex;align-items:center;gap:10px}
.vid{font-family:var(--mono);font-size:13px;font-weight:600;background:var(--surface);
  border:1px solid var(--line);border-radius:999px;padding:3px 10px}
.chip{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.04em;
  color:var(--chip-fg);background:var(--chip-bg);border-radius:999px;padding:4px 10px}
.card__title{font-size:19px;font-weight:700;letter-spacing:-.01em;margin:0;line-height:1.25}
.card__title a{text-decoration:none}
.card__title a:hover{text-decoration:underline;text-underline-offset:3px}
.card__note{margin:0;color:var(--muted);font-size:14px}
.card__facts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:4px 0 0;
  border-top:1px solid var(--line);padding-top:14px}
.card__facts dt{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin:0}
.card__facts dd{margin:2px 0 0;font-size:13px;font-weight:500}
.card__cta{margin-top:auto;display:inline-flex;align-items:center;gap:8px;align-self:flex-start;
  font-weight:600;font-size:14px;text-decoration:none;padding:9px 16px;border-radius:999px;
  background:var(--ink);color:#fff;transition:gap .15s ease, opacity .15s ease}
.card__cta:hover{gap:12px;opacity:.92}
.empty{grid-column:1/-1;color:var(--muted);font-family:var(--mono);padding:48px 0;text-align:center}
/* focus a11y */
a:focus-visible{outline:2px solid var(--indigo);outline-offset:3px;border-radius:6px}
/* footer */
.foot{margin:64px 0 56px;padding-top:24px;border-top:1px solid var(--line);
  color:var(--muted);font-family:var(--mono);font-size:12px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
@media (max-width:560px){.masthead{padding:40px 0 24px}.card__facts{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<header class="masthead">
  <div class="wrap">
    <p class="eyebrow">Prologue · Design Showcase</p>
    <h1>${esc(data.title)}</h1>
    <p>${esc(data.description ?? data.subtitle ?? "")}</p>
    <span class="count">${count} version${count === 1 ? "" : "s"} · v{n}-{tool}</span>
  </div>
</header>
<main class="wrap">
  <ul class="grid">
    ${cards || empty}
  </ul>
</main>
<footer class="wrap">
  <div class="foot">
    <span>${esc(data.subtitle ?? "")}</span>
    <span>Generated from versions.json</span>
  </div>
</footer>
</body>
</html>
`;
}

async function main() {
  const data = JSON.parse(await readFile(join(root, "versions.json"), "utf8"));

  if (await exists(OUT)) await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // 各版の vendor 済みビルドを out/<id>/ へ収集。
  for (const v of data.versions ?? []) {
    const src = join(root, v.dir);
    if (!(await exists(src))) {
      console.warn(`[skip] ${v.id}: ${v.dir} が見つからぬ`);
      continue;
    }
    await cp(src, join(OUT, v.id), { recursive: true });
    console.log(`[copy] ${v.id} ← ${v.dir}`);
  }

  // ギャラリー自身のアセット（サムネ等）。
  const assets = join(root, "assets");
  if (await exists(assets)) {
    await cp(assets, join(OUT, "assets"), { recursive: true });
    console.log("[copy] assets/");
  }

  await writeFile(join(OUT, "index.html"), page(data), "utf8");
  await writeFile(join(OUT, ".nojekyll"), "");
  console.log(`[done] out/ generated (${(data.versions ?? []).length} versions)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
