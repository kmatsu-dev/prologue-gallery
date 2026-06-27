# prologue-gallery

株式会社プロローグ コーポレートサイトの**試作版ショーケース**。
Claude / Codex が制作した複数のホームページ版を、1つの GitHub Pages サイトに集約して見比べる。

- 公開URL: `https://kmatsu-dev.github.io/prologue-gallery/`
- 各版: `…/prologue-gallery/<id>/`（例: `v1-claude/`, `v2-codex/`）
- 版の識別子: **`v{番号}-{ツール}`**（番号 = 制作順、ツール = `claude` / `codex`）

## 仕組み

- 各版の**ソースは各自のリポ**に置く（Claude版は `prologue-corporate` 等）。ここには置かない。
- このリポは「**ビルド済みの表示層**」。各版の静的ビルドを `versions/<id>/` に vendor（取り込み）する。
- [`versions.json`](versions.json) が唯一の真実。`node build-gallery.mjs` が
  これを読んでトップ一覧 `out/index.html` を生成し、各 `versions/<id>/` を `out/<id>/` へ集約する。
- GitHub Actions（[.github/workflows/deploy.yml](.github/workflows/deploy.yml)）が push 毎に
  `build-gallery.mjs` を実行して Pages へデプロイ。**依存パッケージ無し・クロスリポ参照無し**。

## 新しい版を追加する手順

1. **各版のリポでビルド**する。basePath を必ず `/prologue-gallery/<id>` に合わせる。
   例（Next.js の Claude版を v3-claude として出す場合）:
   ```sh
   # prologue-corporate 側で
   NEXT_PUBLIC_BASE_PATH=/prologue-gallery/v3-claude \
   NEXT_PUBLIC_VERSION_LABEL="v3 · Claude" \
   npm run build      # → out/ が生成される
   ```
   Vite の Codex版なら `vite build --base=/prologue-gallery/v2-codex/` のように `base` を合わせる。

2. 生成された静的ビルド（`out/` や `dist/`）を、このリポの **`versions/<id>/`** にコピーする。
   ```sh
   cp -R out/. /path/to/prologue-gallery/versions/v3-claude/
   ```

3. サムネ画像（任意）を `assets/thumbs/<id>.png` に置く（16:10 推奨、デスクトップ表示の上部）。

4. [`versions.json`](versions.json) の `versions` 配列に項目を追加する。

5. コミットして push。Actions が走り、ギャラリーに反映される。

> 注意: 各版の basePath にはリポ名 `prologue-gallery` が焼き込まれる。
> リポ名を変えたら `versions.json` の `basePath` と各版の再ビルドが必要。

## ローカル確認

```sh
node build-gallery.mjs
cd out && python3 -m http.server 8080
# http://localhost:8080/prologue-gallery/ … にはならない点に注意。
# Pages のサブパスを再現するには out/ を prologue-gallery/ 配下に置いて配信する。
```
