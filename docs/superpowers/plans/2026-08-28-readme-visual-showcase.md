# README Visual Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the English and Chinese READMEs into an editorial product showcase with one real Harness hero image, eight deterministic spotlight previews, and a complete 74-theme atlas.

**Architecture:** A pure TypeScript renderer consumes `catalog[].preview` and returns deterministic SVG assets; a thin CLI writes those assets under `docs/assets/readme/`. A browser-captured, data-free Harness settings view is composed into a language-neutral hero PNG. Both README files share the same assets while keeping all prose in separate language files, and package/link tests protect the published artifact.

**Tech Stack:** TypeScript 6, Node.js 24, SVG/XML, Chrome DevTools/headless Chrome, Vitest 4, pnpm 11, DeepSeek Harness `0.1.1-rc.2`.

## Global Constraints

- Do not modify DeepSeek Harness source code or the plugin runtime behavior.
- Read all preview colors from `src/themes/generated/catalog.ts`; do not hand-maintain theme palettes.
- The catalog must contain exactly 74 unique theme IDs.
- Shared images must remain language-neutral; English and Chinese prose stays in separate files.
- The hero must not contain workspace names, session titles, chat content, or other user data.
- Do not add a remote image host, CDN badge service, animation, or runtime dependency.
- The npm tarball must include public README assets and exclude `.superpowers/` and internal planning files.
- Preserve all unrelated uncommitted work already present in the worktree.

---

### Task 1: Build the deterministic SVG renderer

**Files:**
- Create: `scripts/readme-assets.ts`
- Create: `tests/readme-assets.spec.ts`

**Interfaces:**
- Consumes: `readonly ThemeCatalogEntry[]` from `src/themes/contracts.ts`.
- Produces: `SPOTLIGHT_SLUGS`, `ReadmeAsset`, and `generateReadmeAssets(catalog): readonly ReadmeAsset[]`.
- Later tasks rely on output paths `docs/assets/readme/spotlight/<slug>.svg` and `docs/assets/readme/theme-atlas.svg`.

- [ ] **Step 1: Write renderer contract tests**

Create `tests/readme-assets.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { catalog } from '../src/themes/generated/catalog.ts'
import { generateReadmeAssets, SPOTLIGHT_SLUGS } from '../scripts/readme-assets.ts'

describe('README visual assets', () => {
  it('generates eight spotlights and one 74-theme atlas deterministically', () => {
    const first = generateReadmeAssets(catalog)
    const second = generateReadmeAssets(catalog)
    expect(second).toEqual(first)
    expect(first.map(asset => asset.path)).toEqual([
      ...SPOTLIGHT_SLUGS.map(slug => `docs/assets/readme/spotlight/${slug}.svg`).sort(),
      'docs/assets/readme/theme-atlas.svg',
    ].sort())
    const atlas = first.find(asset => asset.path.endsWith('theme-atlas.svg'))!.content
    expect(atlas.match(/data-theme-id=/g)).toHaveLength(74)
    expect(new Set([...atlas.matchAll(/data-theme-id="([^"]+)"/g)].map(match => match[1])).size).toBe(74)
  })

  it('uses the catalog preview colors in each spotlight', () => {
    const assets = generateReadmeAssets(catalog)
    for (const slug of SPOTLIGHT_SLUGS) {
      const entry = catalog.find(theme => theme.slug === slug)!
      const svg = assets.find(asset => asset.path.endsWith(`/${slug}.svg`))!.content
      expect(svg).toContain(entry.preview.base)
      expect(svg).toContain(entry.preview.layer)
      expect(svg).toContain(entry.preview.sidebar)
      expect(svg).toContain(entry.preview.text)
      expect(svg).toContain(entry.preview.accent)
    }
  })

  it('rejects incomplete, duplicate, or unsafe catalog data', () => {
    expect(() => generateReadmeAssets(catalog.slice(0, 73))).toThrow('expected 74 themes')
    expect(() => generateReadmeAssets([...catalog.slice(0, 73), catalog[0]])).toThrow('duplicate theme id')
    const unsafe = catalog.map((entry, index) => index === 0
      ? { ...entry, name: '<script>', preview: { ...entry.preview, accent: 'not-a-color' } }
      : entry)
    expect(() => generateReadmeAssets(unsafe)).toThrow('invalid preview color')
  })
})
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/readme-assets.spec.ts
```

Expected: FAIL because `scripts/readme-assets.ts` does not exist.

- [ ] **Step 3: Implement the pure renderer**

Create `scripts/readme-assets.ts` with the following implementation. Keep the renderer pure: it returns file descriptors and performs no filesystem writes.

```ts
import type { ThemeCatalogEntry } from '../src/themes/contracts.ts'

export const SPOTLIGHT_SLUGS = Object.freeze([
  'claude',
  'binance',
  'linear.app',
  'airbnb',
  'spotify',
  'posthog',
  'ferrari',
  'nintendo-2001',
] as const)

export interface ReadmeAsset {
  readonly path: string
  readonly content: string
}

const HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i
const XML_ESCAPES: Readonly<Record<string, string>> = Object.freeze({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => XML_ESCAPES[character]!)
}

function validateCatalog(catalog: readonly ThemeCatalogEntry[]): void {
  if (catalog.length !== 74) throw new Error(`expected 74 themes, found ${catalog.length}`)
  const ids = new Set<string>()
  for (const entry of catalog) {
    if (ids.has(entry.id)) throw new Error(`duplicate theme id: ${entry.id}`)
    ids.add(entry.id)
    for (const [role, color] of Object.entries(entry.preview)) {
      if (!HEX.test(color)) throw new Error(`invalid preview color for ${entry.id}.${role}: ${color}`)
    }
  }
  for (const slug of SPOTLIGHT_SLUGS) {
    if (!catalog.some(entry => entry.slug === slug)) throw new Error(`missing spotlight theme: ${slug}`)
  }
}

function miniInterface(entry: ThemeCatalogEntry, width: number, height: number): string {
  const sidebarWidth = Math.round(width * 0.22)
  const contentX = sidebarWidth + 28
  return `
    <g data-theme-id="${escapeXml(entry.id)}">
      <rect width="${width}" height="${height}" rx="18" fill="${entry.preview.base}"/>
      <rect x="${sidebarWidth}" width="${width - sidebarWidth}" height="${height}" rx="18" fill="${entry.preview.layer}"/>
      <rect width="${sidebarWidth}" height="${height}" rx="18" fill="${entry.preview.sidebar}"/>
      <rect x="${sidebarWidth - 18}" width="18" height="${height}" fill="${entry.preview.sidebar}"/>
      <rect x="${contentX}" y="${Math.round(height * .28)}" width="${Math.round(width * .46)}" height="10" rx="5" fill="${entry.preview.text}" opacity=".78"/>
      <rect x="${contentX}" y="${Math.round(height * .28) + 22}" width="${Math.round(width * .31)}" height="8" rx="4" fill="${entry.preview.text}" opacity=".38"/>
      <rect x="${contentX}" y="${Math.round(height * .28) + 48}" width="${Math.round(width * .19)}" height="22" rx="6" fill="${entry.preview.accent}"/>
    </g>`
}

function spotlightSvg(entry: ThemeCatalogEntry): string {
  const name = escapeXml(entry.name)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="420" viewBox="0 0 720 420" role="img" aria-labelledby="title">
  <title id="title">${name} theme preview</title>
  <rect width="720" height="420" rx="28" fill="#111318"/>
  <g transform="translate(36 36)">${miniInterface(entry, 648, 286)}</g>
  <text x="42" y="364" fill="#f8fafc" font-family="ui-monospace, SFMono-Regular, monospace" font-size="22" font-weight="700">${name.toUpperCase()}</text>
  <circle cx="654" cy="356" r="13" fill="${entry.preview.accent}"/>
</svg>\n`
}

function atlasSvg(catalog: readonly ThemeCatalogEntry[]): string {
  const columns = 6
  const cardWidth = 240
  const cardHeight = 142
  const gap = 16
  const outer = 32
  const rows = Math.ceil(catalog.length / columns)
  const width = outer * 2 + columns * cardWidth + (columns - 1) * gap
  const height = 96 + outer + rows * cardHeight + (rows - 1) * gap + outer
  const cards = catalog.map((entry, index) => {
    const x = outer + (index % columns) * (cardWidth + gap)
    const y = 96 + outer + Math.floor(index / columns) * (cardHeight + gap)
    return `<g transform="translate(${x} ${y})">
      ${miniInterface(entry, cardWidth, 104)}
      <text x="4" y="132" fill="#e5e7eb" font-family="ui-monospace, SFMono-Regular, monospace" font-size="12" font-weight="700">${escapeXml(entry.name.toUpperCase())}</text>
    </g>`
  }).join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
  <title id="title">74 Design MD themes</title>
  <rect width="${width}" height="${height}" rx="30" fill="#111318"/>
  <text x="${outer}" y="58" fill="#f8fafc" font-family="system-ui, sans-serif" font-size="34" font-weight="800">THEME ATLAS / 01—74</text>
  ${cards}
</svg>\n`
}

export function generateReadmeAssets(catalog: readonly ThemeCatalogEntry[]): readonly ReadmeAsset[] {
  validateCatalog(catalog)
  const spotlights = SPOTLIGHT_SLUGS.map(slug => {
    const entry = catalog.find(theme => theme.slug === slug)!
    return { path: `docs/assets/readme/spotlight/${slug}.svg`, content: spotlightSvg(entry) }
  })
  return Object.freeze([
    ...spotlights,
    { path: 'docs/assets/readme/theme-atlas.svg', content: atlasSvg(catalog) },
  ].sort((left, right) => left.path.localeCompare(right.path)))
}
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/readme-assets.spec.ts
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit the renderer slice**

```bash
git add scripts/readme-assets.ts tests/readme-assets.spec.ts
git commit -m "feat: render deterministic README theme previews"
```

---

### Task 2: Add the asset CLI and generate committed SVGs

**Files:**
- Create: `scripts/generate-readme-assets.ts`
- Create: `docs/assets/readme/theme-atlas.svg`
- Create: `docs/assets/readme/spotlight/airbnb.svg`
- Create: `docs/assets/readme/spotlight/binance.svg`
- Create: `docs/assets/readme/spotlight/claude.svg`
- Create: `docs/assets/readme/spotlight/ferrari.svg`
- Create: `docs/assets/readme/spotlight/linear.app.svg`
- Create: `docs/assets/readme/spotlight/nintendo-2001.svg`
- Create: `docs/assets/readme/spotlight/posthog.svg`
- Create: `docs/assets/readme/spotlight/spotify.svg`
- Modify: `package.json`
- Modify: `tests/package-contract.spec.ts`

**Interfaces:**
- Consumes: `generateReadmeAssets(catalog)` from Task 1.
- Produces: committed SVG files and the `pnpm readme:assets` command.

- [ ] **Step 1: Extend the package contract test first**

In `tests/package-contract.spec.ts`, change the expected `files` list to include public README assets and assert the generator script exists:

```ts
expect(pkg.files).toEqual([
  'lib',
  'cordis.patch.yml',
  'README.md',
  'README.zh.md',
  'docs/*.md',
  'docs/assets/readme/**/*',
  'LICENSE',
  'THIRD_PARTY_NOTICES.md',
  'THIRD_PARTY_NOTICES.zh-CN.md',
])
expect(pkg.scripts['readme:assets']).toBe('node --import tsx scripts/generate-readme-assets.ts')
```

- [ ] **Step 2: Run the contract test and verify it fails**

Run:

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/package-contract.spec.ts
```

Expected: FAIL because `docs/assets/readme/**/*` and `readme:assets` are not yet declared.

- [ ] **Step 3: Add the CLI writer**

Create `scripts/generate-readme-assets.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { catalog } from '../src/themes/generated/catalog.ts'
import { generateReadmeAssets } from './readme-assets.ts'

const root = resolve(process.cwd())
const assets = generateReadmeAssets(catalog)
for (const asset of assets) {
  const target = resolve(root, asset.path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, asset.content, 'utf8')
}
console.log(`generated ${assets.length} README assets`)
```

Modify `package.json`:

```json
{
  "files": [
    "lib",
    "cordis.patch.yml",
    "README.md",
    "README.zh.md",
    "docs/*.md",
    "docs/assets/readme/**/*",
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "THIRD_PARTY_NOTICES.zh-CN.md"
  ],
  "scripts": {
    "readme:assets": "node --import tsx scripts/generate-readme-assets.ts"
  }
}
```

Preserve every existing key and script not shown above.

- [ ] **Step 4: Generate the assets twice and prove byte stability**

Run:

```bash
fnm exec --using=24.19.0 pnpm readme:assets
shasum -a 256 docs/assets/readme/theme-atlas.svg docs/assets/readme/spotlight/*.svg
fnm exec --using=24.19.0 pnpm readme:assets
shasum -a 256 docs/assets/readme/theme-atlas.svg docs/assets/readme/spotlight/*.svg
```

Expected: both checksum lists are identical and the command reports `generated 9 README assets` each time.

- [ ] **Step 5: Run the focused tests**

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/readme-assets.spec.ts tests/package-contract.spec.ts
```

Expected: all focused tests PASS.

- [ ] **Step 6: Commit generated assets and package wiring**

```bash
git add scripts/generate-readme-assets.ts package.json tests/package-contract.spec.ts docs/assets/readme
git commit -m "docs: generate the README theme atlas"
```

---

### Task 3: Capture a private-data-free Harness hero image

**Files:**
- Create: `docs/assets/readme/hero.png`
- Modify: `docs/maintenance.md`
- Modify: `docs/maintenance.zh-CN.md`

**Interfaces:**
- Consumes: installed local tarball and isolated Harness profile; four spotlight palettes from Task 2.
- Produces: a 1600×900 language-neutral PNG under 600KB.

- [ ] **Step 1: Start an isolated Harness profile**

Use Node 24 and a temporary Harness state directory; never open the normal user profile for the capture:

```bash
mkdir -p /tmp/dsh-readme-hero
DSH_HOME=/tmp/dsh-readme-hero fnm exec --using=24.19.0 dsh plugin --profile readme add --offline /Users/yonglun/Repo/deepseek-hardness-theme/.pack/deepseek-harness-design-md-themes-0.1.0.tgz
DSH_HOME=/tmp/dsh-readme-hero fnm exec --using=24.19.0 dsh --profile readme --no-open --port 3090
```

Expected: Harness reports `http://127.0.0.1:3090`, and the profile contains no workspace or session data.

- [ ] **Step 2: Capture the real settings surface**

Use the `browser-testing-with-devtools` skill to open `http://127.0.0.1:3090`, open Settings → Design MD themes, select Claude, and capture only the settings dialog at a 1440×900 viewport. Save the crop to `/tmp/dsh-readme-hero/harness-settings.png`.

Expected visual checks:

- `Design MD themes` heading is visible;
- multiple theme cards are visible;
- no workspace name, session name, messages, usernames, or local paths are visible;
- Claude cream and terracotta colors are visibly applied.

- [ ] **Step 3: Compose the approved Editorial Hero**

Create a temporary full-document HTML file at `/tmp/dsh-readme-hero/hero.html` using the approved mockup. The HTML must contain:

```html
<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1600px;height:900px;overflow:hidden;background:#111318;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.hero{position:relative;width:1600px;height:900px;padding:86px 92px;color:#f8fafc;background:radial-gradient(circle at 82% 12%,#3b4154 0,transparent 34%),linear-gradient(140deg,#111318,#1b1e26)}.eyebrow{font:700 18px ui-monospace,monospace;letter-spacing:.16em;color:#a7b0c2}.title{margin:38px 0 22px;font-size:104px;line-height:.95;letter-spacing:-.065em}.meta{display:flex;gap:12px}.meta span{padding:12px 18px;border:1px solid #4a5060;border-radius:99px;font:700 14px ui-monospace,monospace;color:#d7dce5}.shot{position:absolute;right:80px;bottom:64px;width:860px;border:1px solid #4a5060;border-radius:24px;box-shadow:0 44px 100px #0009}.count{position:absolute;left:92px;bottom:84px;font-size:180px;font-weight:850;line-height:.8;letter-spacing:-.08em}.count small{display:block;margin-top:24px;font:700 16px ui-monospace,monospace;letter-spacing:.18em;color:#a7b0c2}.theme-card{position:absolute;width:230px;border:1px solid #ffffff2b;border-radius:14px;box-shadow:0 24px 55px #0008}.airbnb{right:790px;bottom:120px;transform:rotate(-7deg)}.binance{right:28px;top:118px;transform:rotate(6deg)}.claude{right:700px;top:74px;transform:rotate(-4deg)}.linear{right:26px;bottom:38px;transform:rotate(8deg)}
</style></head><body><main class="hero"><div class="eyebrow">DESIGN MD × DEEPSEEK HARNESS</div><h1 class="title">ONE NATIVE<br>PLUGIN.</h1><div class="meta"><span>NON-INVASIVE</span><span>WCAG CHECKED</span></div><div class="count">74<small>DETERMINISTIC THEMES</small></div><img class="shot" src="harness-settings.png" alt=""><img class="theme-card airbnb" src="file:///Users/yonglun/Repo/deepseek-hardness-theme/docs/assets/readme/spotlight/airbnb.svg" alt=""><img class="theme-card binance" src="file:///Users/yonglun/Repo/deepseek-hardness-theme/docs/assets/readme/spotlight/binance.svg" alt=""><img class="theme-card claude" src="file:///Users/yonglun/Repo/deepseek-hardness-theme/docs/assets/readme/spotlight/claude.svg" alt=""><img class="theme-card linear" src="file:///Users/yonglun/Repo/deepseek-hardness-theme/docs/assets/readme/spotlight/linear.app.svg" alt=""></main></body></html>
```

Capture it with headless Chrome:

```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --headless=new --hide-scrollbars --allow-file-access-from-files --window-size=1600,900 --screenshot=/Users/yonglun/Repo/deepseek-hardness-theme/docs/assets/readme/hero.png file:///tmp/dsh-readme-hero/hero.html
```

Expected: `docs/assets/readme/hero.png` is exactly 1600×900.

- [ ] **Step 4: Verify privacy and file size manually**

Run:

```bash
sips -g pixelWidth -g pixelHeight docs/assets/readme/hero.png
du -k docs/assets/readme/hero.png
```

Expected: `pixelWidth: 1600`, `pixelHeight: 900`, and size no greater than 600KB. Open the image and confirm again that no user-specific content is present.

- [ ] **Step 5: Document hero recapture in both maintenance files**

Append this section to `docs/maintenance.md`:

````md
## README visual assets

Regenerate the deterministic spotlight and atlas SVGs with:

```bash
pnpm readme:assets
```

Capture the Harness settings surface from an isolated `DSH_HOME` at a 1440×900 viewport. The profile must contain no workspaces, sessions, or chat data. Compose the final `docs/assets/readme/hero.png` at 1600×900, inspect it for private content, then run `pnpm pack:check` to verify every public asset is included.
````

Append this section to `docs/maintenance.zh-CN.md`:

````md
## README 视觉资产

使用以下命令重新生成确定性的精选主题和图谱 SVG：

```bash
pnpm readme:assets
```

请使用隔离的 `DSH_HOME`，以 1440×900 视口截取 Harness 设置页面；该 profile 不能包含工作区、会话或聊天数据。将最终 `docs/assets/readme/hero.png` 合成为 1600×900，人工检查其中没有私密内容，再运行 `pnpm pack:check` 验证所有公开资产均已进入发布包。
````

- [ ] **Step 6: Commit the hero slice**

```bash
git add docs/assets/readme/hero.png docs/maintenance.md docs/maintenance.zh-CN.md
git commit -m "docs: add the Harness editorial hero"
```

---

### Task 4: Rewrite the English and Chinese READMEs

**Files:**
- Modify: `README.md`
- Modify: `README.zh.md`

**Interfaces:**
- Consumes: `hero.png`, eight spotlight SVGs, `theme-atlas.svg`.
- Produces: matching English and Chinese README structures with language-specific prose.

- [ ] **Step 1: Add a failing README structure test**

Create `tests/readme.spec.ts`:

```ts
import { access, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const documents = ['README.md', 'README.zh.md'] as const
const requiredAssets = [
  'docs/assets/readme/hero.png',
  'docs/assets/readme/theme-atlas.svg',
  'docs/assets/readme/spotlight/claude.svg',
  'docs/assets/readme/spotlight/binance.svg',
  'docs/assets/readme/spotlight/linear.app.svg',
  'docs/assets/readme/spotlight/airbnb.svg',
  'docs/assets/readme/spotlight/spotify.svg',
  'docs/assets/readme/spotlight/posthog.svg',
  'docs/assets/readme/spotlight/ferrari.svg',
  'docs/assets/readme/spotlight/nintendo-2001.svg',
]

describe('README showcase', () => {
  it.each(documents)('%s has the approved content hierarchy and local images', async file => {
    const markdown = await readFile(resolve(file), 'utf8')
    for (const asset of requiredAssets) expect(markdown).toContain(asset)
    const hero = markdown.indexOf('docs/assets/readme/hero.png')
    const install = markdown.indexOf('dsh plugin add deepseek-harness-design-md-themes')
    const spotlight = markdown.indexOf('docs/assets/readme/spotlight/claude.svg')
    const atlas = markdown.indexOf('docs/assets/readme/theme-atlas.svg')
    expect(hero).toBeGreaterThan(-1)
    expect(install).toBeGreaterThan(hero)
    expect(spotlight).toBeGreaterThan(install)
    expect(atlas).toBeGreaterThan(spotlight)
  })

  it('keeps every relative README link resolvable', async () => {
    for (const file of documents) {
      const markdown = await readFile(resolve(file), 'utf8')
      for (const match of markdown.matchAll(/(?:!?)\[[^\]]*\]\(([^)]+)\)|<img[^>]+src="([^"]+)"/g)) {
        const target = match[1] ?? match[2]
        const path = target?.split('#')[0]
        if (!path || /^(?:https?:|mailto:|#)/.test(path)) continue
        await expect(access(resolve(dirname(file), path))).resolves.toBeUndefined()
      }
    }
  })
})
```

- [ ] **Step 2: Run the README test and verify it fails**

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/readme.spec.ts
```

Expected: FAIL because the current READMEs do not reference the new assets.

- [ ] **Step 3: Rewrite `README.md` using the approved hierarchy**

Use this exact section order and image structure, filling each prose section with the existing verified compatibility and persistence facts:

````md
# deepseek-harness-design-md-themes

Chinese version: [README.zh.md](README.zh.md)

![74 deterministic Design MD themes for DeepSeek Harness](docs/assets/readme/hero.png)

> 74 deterministic themes generated from `awesome-design-md`, installed through the native DeepSeek Harness plugin mechanism—without patching Harness source code.

## Quick start

```bash
dsh plugin add deepseek-harness-design-md-themes
dsh web
```

Open **Settings → Design MD themes**, choose a card, and the selection remains active after reload.

## Why this plugin

- **Native integration** — registers themes through Theme Service and contributes one `settings.section`.
- **Deterministic catalog** — 74 themes generated from pinned source commit `8147538b4226ae41e2487a9179e3bcc1f68e8554`.
- **Owned persistence** — writes only the `deepseek-harness-design-md-themes` settings namespace.

## Eight signature themes

<p align="center">
  <img src="docs/assets/readme/spotlight/claude.svg" width="48%" alt="Claude theme preview">
  <img src="docs/assets/readme/spotlight/binance.svg" width="48%" alt="Binance theme preview">
  <img src="docs/assets/readme/spotlight/linear.app.svg" width="48%" alt="Linear theme preview">
  <img src="docs/assets/readme/spotlight/airbnb.svg" width="48%" alt="Airbnb theme preview">
  <img src="docs/assets/readme/spotlight/spotify.svg" width="48%" alt="Spotify theme preview">
  <img src="docs/assets/readme/spotlight/posthog.svg" width="48%" alt="PostHog theme preview">
  <img src="docs/assets/readme/spotlight/ferrari.svg" width="48%" alt="Ferrari theme preview">
  <img src="docs/assets/readme/spotlight/nintendo-2001.svg" width="48%" alt="Nintendo 2001 theme preview">
</p>

## All 74 themes

![Complete atlas of 74 Design MD themes](docs/assets/readme/theme-atlas.svg)

See [the catalog](docs/themes.md) for theme IDs, categories, source paths, and contrast adjustments.

## Non-invasive by design

The plugin uses the documented `dsh.client` injection list, Cordis patch contribution, Theme Service, Settings Scope, Locale Service, and UI Slots. It does not patch Harness components, query internal DOM, override unrelated global CSS, or replace Harness files.

## Compatibility and maintenance

- DeepSeek Harness `0.1.1-rc.2`
- Node.js `^22.19.0 || >=24.0.0` for generation and packaging
- React `18.2+` or `19.x`, supplied by Harness

Installation: [docs/installation.md](docs/installation.md) · Maintenance: [docs/maintenance.md](docs/maintenance.md) · Attribution: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
````

- [ ] **Step 4: Rewrite `README.zh.md` with matching Chinese content**

Use the same asset order and section hierarchy. Translate the headings and copy, but keep commands, versions, IDs, commit hashes, package names, and image paths byte-identical:

````md
# deepseek-harness-design-md-themes

英文版：[README.md](README.md)

![DeepSeek Harness 的 74 个确定性 Design MD 主题](docs/assets/readme/hero.png)

> 基于 `awesome-design-md` 确定性生成 74 个主题，通过 DeepSeek Harness 原生插件机制安装，无需修改 Harness 源码。

## 快速开始

```bash
dsh plugin add deepseek-harness-design-md-themes
dsh web
```

打开“设置 → Design MD themes”，选择主题卡片；刷新页面后仍会保持所选主题。

## 为什么选择这个插件

- **原生集成**——通过 Theme Service 注册主题，并贡献一个 `settings.section`。
- **确定性目录**——74 个主题来自固定上游提交 `8147538b4226ae41e2487a9179e3bcc1f68e8554`。
- **独立持久化**——只写入 `deepseek-harness-design-md-themes` 自有设置命名空间。

## 八个代表性主题

<p align="center">
  <img src="docs/assets/readme/spotlight/claude.svg" width="48%" alt="Claude 主题预览">
  <img src="docs/assets/readme/spotlight/binance.svg" width="48%" alt="Binance 主题预览">
  <img src="docs/assets/readme/spotlight/linear.app.svg" width="48%" alt="Linear 主题预览">
  <img src="docs/assets/readme/spotlight/airbnb.svg" width="48%" alt="Airbnb 主题预览">
  <img src="docs/assets/readme/spotlight/spotify.svg" width="48%" alt="Spotify 主题预览">
  <img src="docs/assets/readme/spotlight/posthog.svg" width="48%" alt="PostHog 主题预览">
  <img src="docs/assets/readme/spotlight/ferrari.svg" width="48%" alt="Ferrari 主题预览">
  <img src="docs/assets/readme/spotlight/nintendo-2001.svg" width="48%" alt="Nintendo 2001 主题预览">
</p>

## 全部 74 个主题

![74 个 Design MD 主题完整图谱](docs/assets/readme/theme-atlas.svg)

主题 ID、分类、来源路径和对比度调整见[中文主题目录](docs/themes.zh-CN.md)。

## 无侵入式设计

插件只使用公开的 `dsh.client` 注入列表、Cordis patch、Theme Service、Settings Scope、Locale Service 和 UI Slots。它不会修改 Harness 组件、访问内部 DOM、覆盖无关全局 CSS 或替换 Harness 文件。

## 兼容性与维护

- DeepSeek Harness `0.1.1-rc.2`
- 本地生成和打包需要 Node.js `^22.19.0 || >=24.0.0`
- React `18.2+` 或 `19.x`，由 Harness 提供

安装：[docs/installation.zh-CN.md](docs/installation.zh-CN.md) · 维护：[docs/maintenance.zh-CN.md](docs/maintenance.zh-CN.md) · 第三方声明：[THIRD_PARTY_NOTICES.zh-CN.md](THIRD_PARTY_NOTICES.zh-CN.md)
````

- [ ] **Step 5: Run the README and renderer tests**

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/readme.spec.ts tests/readme-assets.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit the README rewrite**

```bash
git add README.md README.zh.md tests/readme.spec.ts
git commit -m "docs: showcase all 74 Harness themes"
```

---

### Task 5: Protect assets in the npm package and run the full release gate

**Files:**
- Modify: `build/package-smoke.ts`
- Modify: `tests/package-smoke.spec.ts` only if its existing tarball selection requires adjustment
- Modify: `.gitignore` only if a new non-public temporary path is created inside the repository

**Interfaces:**
- Consumes: the published file list from Task 2 and README paths from Task 4.
- Produces: package smoke checks that reject missing assets and internal brainstorming files.

- [ ] **Step 1: Add required asset paths to the package smoke contract**

Insert these entries into `REQUIRED_PACKAGE_FILES` in `build/package-smoke.ts` after the existing public documentation paths:

```ts
'package/docs/assets/readme/hero.png',
'package/docs/assets/readme/theme-atlas.svg',
'package/docs/assets/readme/spotlight/airbnb.svg',
'package/docs/assets/readme/spotlight/binance.svg',
'package/docs/assets/readme/spotlight/claude.svg',
'package/docs/assets/readme/spotlight/ferrari.svg',
'package/docs/assets/readme/spotlight/linear.app.svg',
'package/docs/assets/readme/spotlight/nintendo-2001.svg',
'package/docs/assets/readme/spotlight/posthog.svg',
'package/docs/assets/readme/spotlight/spotify.svg',
```

Add this explicit internal-document rejection next to the existing development-only check:

```ts
if ([...fileSet].some(file => file.includes('/docs/superpowers/') || file.includes('/.superpowers/'))) {
  throw new Error('package contains internal planning files')
}
```

- [ ] **Step 2: Verify package smoke fails against the stale tarball**

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/package-smoke.spec.ts
```

Expected: FAIL because the existing tarball does not yet contain README image assets.

- [ ] **Step 3: Build and create a fresh tarball**

```bash
fnm exec --using=24.19.0 pnpm build
fnm exec --using=24.19.0 pnpm pack:check
```

Expected: build exits 0 and package smoke reports `package smoke passed`.

- [ ] **Step 4: Inspect the tarball’s public documentation files**

```bash
tar -tzf .pack/deepseek-harness-design-md-themes-0.1.0.tgz | rg '^package/(README|docs/assets/readme|docs/.*\.md|THIRD_PARTY)'
```

Expected: both READMEs, both language documentation sets, hero PNG, atlas SVG, and eight spotlight SVGs are present; no `docs/superpowers`, `.superpowers`, `src`, or `tests` entries appear.

- [ ] **Step 5: Run the full verification gate**

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run --config vitest.config.ts
fnm exec --using=24.19.0 ./node_modules/.bin/tsc -p tsconfig.json
fnm exec --using=24.19.0 ./node_modules/.bin/tsc -p tsconfig.host.json
fnm exec --using=24.19.0 ./node_modules/.bin/tsc -p tsconfig.client.json
git diff --check
```

Expected: 0 failed tests, all three TypeScript commands exit 0, and `git diff --check` produces no output.

- [ ] **Step 6: Review rendered READMEs**

Open both README files in the Codex Markdown viewer or GitHub-compatible preview. Verify:

- the hero renders before Quick Start;
- spotlight images form two columns on desktop and remain readable on narrow widths;
- the atlas is legible when opened at full size;
- English and Chinese files contain only their own prose;
- every link resolves locally;
- the hero contains no private data.

- [ ] **Step 7: Commit the package protection**

```bash
git add build/package-smoke.ts tests/package-smoke.spec.ts package.json docs/assets/readme
git commit -m "test: protect published README assets"
```

---

## Final review checklist

- [ ] Re-read `docs/superpowers/specs/2026-08-28-readme-visual-showcase-design.md` and map every acceptance criterion to Tasks 1–5.
- [ ] Confirm `SPOTLIGHT_SLUGS` contains exactly the approved eight slugs.
- [ ] Confirm the renderer has no filesystem or network side effects.
- [ ] Confirm the hero came from an isolated profile and contains no personal content.
- [ ] Confirm `README.md` and `README.zh.md` share image paths but not prose.
- [ ] Confirm generated SVGs are byte-stable across two runs.
- [ ] Confirm the tarball contains public assets and excludes internal plans.
- [ ] Confirm the full test, build, type-check, package-smoke, link, and visual review gates pass before claiming completion.
