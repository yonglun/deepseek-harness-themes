# DeepSeek Harness DESIGN.md Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the non-invasive `deepseek-harness-design-md-themes` bundle that deterministically converts the pinned 74-theme `awesome-design-md` catalog into accessible DeepSeek Harness themes with a searchable, persistent settings gallery.

**Architecture:** A development-only compiler reads a pinned local `awesome-design-md` checkout, normalizes its YAML front matter, applies small YAML overrides and deterministic WCAG correction, then commits generated theme modules and reports. A single published Harness bundle has a Host entry for the plugin-owned settings schema and a Client entry that transactionally registers the generated themes, restores preference through `settingsScope`, and contributes a CSS-Module-scoped `settings.section` gallery.

**Tech Stack:** Node.js `^22.19.0 || >=24.0.0`, pnpm `11.7.0`, TypeScript `6.0.3`, React `^18.2.0 || ^19.0.0`, Vitest `4.1.8`, Testing Library `16.3.2`, tsdown `0.22.2`, `js-yaml` `4.2.0`, `culori` `4.0.2`, Schemastery `3.18.1`, DeepSeek Harness `0.1.1-rc.2` public plugin APIs.

## Global Constraints

- The package name is exactly `deepseek-harness-design-md-themes`.
- The initial Harness compatibility baseline is commit `b150a551b8d465e31e418e1b2eaf5e79bbb7d28e`, version `0.1.1-rc.2`.
- The design source is `VoltAgent/awesome-design-md` commit `8147538b4226ae41e2487a9179e3bcc1f68e8554` and must resolve to exactly 74 `design-md/*/DESIGN.md` files.
- Never modify, patch, rebuild, monkey-patch, query internal DOM from, or import unpublished source paths from DeepSeek Harness.
- Runtime integration is limited to `ctx.theme`, `ctx.slots`, `ctx.settingsScope`, `ctx.locale`, Host `settings.register()`, and Cordis lifecycle APIs.
- Theme effects are limited to the checked-in public `--dsw-*` token allowlist; no Harness global selectors, component geometry, layout, radius, motion, wallpaper, or remote font loading.
- Every source produces one canonical light or dark theme; generated IDs are `design-md-<slug>` and never `light`, `dark`, or `system`.
- Normal text must meet 4.5:1 contrast; large text and key non-text controls must meet 3:1.
- Runtime performs no network access and does not parse `DESIGN.md`.
- Generated output is deterministic and checked in; generated files are never edited directly.
- Every implementation task follows red-green-refactor, finishes with its focused verification, and commits only its own files.

## File Structure Map

```text
build/
  client-bundle.ts                  Dynamic client module-loader wrapper and CSS Module bundler
  package-smoke.ts                  Tarball entry and forbidden-import checks
config/
  theme-tokens.ts                   Exact runtime token allowlist and contrast pairs
docs/
  installation.md                  Install, upgrade, remove, remote-browser behavior
  maintenance.md                   Pinned-source update and override workflow
  themes.md                         Generated 74-theme gallery index
reports/
  contrast.json                     Generated WCAG evidence
  sources.json                      Generated provenance/change report
scripts/
  generate-themes.ts                Deterministic generation CLI
  verify-generated.ts               Clean-regeneration guard
src/
  index.ts                          Host plugin entry
  client.ts                         Client plugin entry
  css-modules.d.ts                  CSS Module typing
  host/settings.ts                  Plugin settings schema and Host registration
  themes/contracts.ts               Shared source, normalized, generated and runtime types
  themes/colors.ts                  Parsing, blending, luminance and OKLCH correction
  themes/source.ts                  Pinned checkout discovery and README category extraction
  themes/parse-design.ts            DESIGN.md front-matter parser
  themes/normalize.ts               Source-role to canonical-role normalization
  themes/compile.ts                 Canonical model to Harness ThemeDefinition
  themes/overrides.ts               Override schema, loading and application
  themes/generate.ts                In-memory catalog and report orchestration
  generated/catalog.ts              Generated runtime catalog index
  generated/categories.ts           Generated filter metadata
  generated/source-manifest.json    Pinned source hashes and generator version
  generated/themes/*.ts             Exactly 74 generated ThemeDefinition modules
  runtime/contracts.ts              Structural public Harness service faces
  runtime/register.ts               Catalog prevalidation and transactional registration
  runtime/selection.ts              Selection, restore, arbitration and serialized persistence
  gallery/filter.ts                 Pure search/category/scheme filtering
  gallery/store.ts                  External-store state and actions
  gallery/locales.ts                English/Chinese dictionaries
  gallery/ThemeCard.tsx             Accessible token-derived preview card
  gallery/ThemeGallery.tsx          Settings section and keyboard navigation
  gallery/ThemeGallery.module.css   Scoped responsive card wall
theme-overrides/
  categories.yaml                   Explicit category only for upstream-unlisted slugs
  themes/*.yaml                     Sparse, explained semantic corrections
tests/
  fixtures/awesome-design-md/...    Minimal source fixtures for parser/compiler tests
  package-contract.spec.ts
  source.spec.ts
  parse-design.spec.ts
  normalize.spec.ts
  colors.spec.ts
  compile.spec.ts
  generate.spec.ts
  generated-catalog.spec.ts
  register.spec.ts
  settings.spec.ts
  selection.spec.ts
  gallery-filter.spec.ts
  gallery-store.spec.ts
  gallery.spec.tsx
  client.spec.ts
  package-smoke.spec.ts
  harness-profile.e2e.spec.ts
cordis.patch.yml                    Profile bundle layer
package.json                        npm and dsh manifests
pnpm-lock.yaml
tsconfig.json
tsconfig.host.json
tsconfig.client.json
tsdown.config.ts
vitest.config.ts
```

---

### Task 1: Buildable External Harness Bundle Foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `tsconfig.host.json`
- Create: `tsconfig.client.json`
- Create: `tsdown.config.ts`
- Create: `vitest.config.ts`
- Create: `build/client-bundle.ts`
- Create: `src/index.ts`
- Create: `src/client.ts`
- Create: `src/css-modules.d.ts`
- Create: `cordis.patch.yml`
- Create: `tests/package-contract.spec.ts`
- Create: `.gitignore`

**Interfaces:**
- Consumes: Harness dynamic-client contract from baseline `0.1.1-rc.2`.
- Produces: Node ESM `lib/index.js`, browser loader artifact `lib/client.js`, declarations, and an installable `dsh.bundle` patch.

- [ ] **Step 1: Write the failing package contract test**

```ts
// tests/package-contract.spec.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

describe('package contract', () => {
  it('is one installable dsh host/client bundle', () => {
    expect(pkg.name).toBe('deepseek-harness-design-md-themes')
    expect(pkg.type).toBe('module')
    expect(pkg.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(pkg.dsh.client).toEqual({
      inject: [
        '@deepseek-ai/dsh-client-ui-theme',
        '@deepseek-ai/dsh-client-runtime',
        '@deepseek-ai/dsh-client-ui-slots',
        '@deepseek-ai/dsh-client-locale',
      ],
      platform: 'web',
      immediately: true,
    })
    expect(pkg.files).toEqual(['lib', 'cordis.patch.yml', 'README.md', 'README.zh.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md'])
  })
})
```

- [ ] **Step 2: Run the focused test and confirm the missing manifest failure**

Run: `pnpm exec vitest run tests/package-contract.spec.ts`

Expected: FAIL because `package.json` and the Vitest toolchain are not present.

- [ ] **Step 3: Create the package manifest and bundle patch**

```json
{
  "name": "deepseek-harness-design-md-themes",
  "version": "0.1.0",
  "description": "74 non-invasive DeepSeek Harness themes generated from awesome-design-md",
  "type": "module",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "exports": {
    ".": { "types": "./lib/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/client.d.ts", "default": "./lib/client.js" },
    "./package.json": "./package.json"
  },
  "files": ["lib", "cordis.patch.yml", "README.md", "README.zh.md", "LICENSE", "THIRD_PARTY_NOTICES.md"],
  "engines": { "node": "^22.19.0 || >=24.0.0" },
  "packageManager": "pnpm@11.7.0",
  "dsh": {
    "client": {
      "inject": [
        "@deepseek-ai/dsh-client-ui-theme",
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-slots",
        "@deepseek-ai/dsh-client-locale"
      ],
      "platform": "web",
      "immediately": true
    },
    "bundle": { "patch": "./cordis.patch.yml" }
  },
  "scripts": {
    "build": "tsdown --config-loader tsx && tsc -p tsconfig.host.json && tsc -p tsconfig.client.json",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "themes:generate": "tsx scripts/generate-themes.ts",
    "themes:verify": "tsx scripts/verify-generated.ts",
    "pack:check": "pnpm pack --pack-destination .pack && tsx build/package-smoke.ts"
  },
  "dependencies": {
    "clsx": "2.1.1"
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "4.0.1",
    "@deepseek-ai/dsh-client-locale": "0.1.1-rc.2",
    "@deepseek-ai/dsh-client-runtime": "0.1.1-rc.2",
    "@deepseek-ai/dsh-client-ui-slots": "0.1.1-rc.2",
    "@deepseek-ai/dsh-client-ui-theme": "0.1.1-rc.2",
    "@deepseek-ai/schemastery": "3.18.1",
    "react": "^18.2.0 || ^19.0.0"
  },
  "peerDependenciesMeta": {
    "@deepseek-ai/cordis": { "optional": true },
    "@deepseek-ai/dsh-client-locale": { "optional": true },
    "@deepseek-ai/dsh-client-runtime": { "optional": true },
    "@deepseek-ai/dsh-client-ui-slots": { "optional": true },
    "@deepseek-ai/dsh-client-ui-theme": { "optional": true },
    "@deepseek-ai/schemastery": { "optional": true },
    "react": { "optional": true }
  },
  "devDependencies": {
    "@deepseek-ai/cordis": "4.0.1",
    "@deepseek-ai/schemastery": "3.18.1",
    "@testing-library/react": "16.3.2",
    "@types/js-yaml": "4.0.9",
    "@types/node": "22.20.0",
    "@types/react": "19.2.18",
    "@types/react-dom": "19.2.4",
    "@vitest/coverage-v8": "4.1.8",
    "culori": "4.0.2",
    "js-yaml": "4.2.0",
    "jsdom": "29.1.1",
    "lightningcss": "1.32.0",
    "react": "19.2.8",
    "react-dom": "19.2.4",
    "tsdown": "0.22.2",
    "tsx": "4.22.4",
    "typescript": "6.0.3",
    "vitest": "4.1.8"
  }
}
```

```yaml
# cordis.patch.yml
- insert:
    - id: design-md-themes
      name: deepseek-harness-design-md-themes
```

`build/client-bundle.ts` must emit two configs: an ESM Host library and a browser CJS factory. Set `dts: false` in the tsdown Host config; `tsconfig.host.json` and `tsconfig.client.json` separately emit declarations because tsdown 0.22.2 otherwise invokes an unavailable `unrun` resolver in this standalone package. Start with this exact no-CSS foundation; Task 10 adds the CSS Module plugin when the first stylesheet exists:

```ts
import type { UserConfig } from 'tsdown'

const HOST_MODULE = /^@deepseek-ai(?:\/|$)/

export function clientBundle(id: string): UserConfig[] {
  return [
    {
      name: id,
      entry: { index: 'src/index.ts' },
      outDir: 'lib',
      format: ['esm'],
      fixedExtension: false,
      dts: false,
      clean: false,
    },
    {
      name: `${id}/client`,
      entry: { client: 'src/client.ts' },
      outDir: 'lib',
      format: 'cjs',
      platform: 'browser',
      clean: false,
      deps: {
        neverBundle: [HOST_MODULE, 'react', 'react/jsx-runtime', '@deepseek-ai/cordis'],
        onlyBundle: ['clsx'],
      },
      outputOptions: {
        entryFileNames: 'client.js',
        banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}, factory: (require) => {`,
        footer: 'return module.exports; } });',
        intro: 'var module = { exports: {} }; var exports = module.exports;',
      },
    },
  ]
}
```

```ts
// tsdown.config.ts
import { clientBundle } from './build/client-bundle.ts'
export default clientBundle('deepseek-harness-design-md-themes')
```

- [ ] **Step 4: Add minimal entries and strict TypeScript/Vitest configuration**

```ts
// src/index.ts
export const name = 'deepseek-harness-design-md-themes'
export function apply(): void {}
```

```ts
// src/client.ts
export const inject = ['theme', 'settingsScope', 'slots', 'locale'] as const
export function apply(): void {}
```

Use `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `jsx: "react-jsx"`, and a jsdom Vitest environment for `*.tsx` tests. Ignore `node_modules/`, `lib/`, `.pack/`, `.superpowers/`, `coverage/`, and `tmp/` in `.gitignore`.

- [ ] **Step 5: Install, verify, and commit the foundation**

Run: `pnpm install && pnpm exec vitest run tests/package-contract.spec.ts && pnpm run build`

Expected: one passing test; `lib/index.js`, `lib/client.js`, and declarations exist.

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.host.json tsconfig.client.json tsdown.config.ts vitest.config.ts build/client-bundle.ts src/index.ts src/client.ts src/css-modules.d.ts cordis.patch.yml tests/package-contract.spec.ts .gitignore
git commit -m "build: scaffold external dsh theme bundle"
```

### Task 2: Theme Contracts and Public Token Allowlist

**Files:**
- Create: `src/themes/contracts.ts`
- Create: `config/theme-tokens.ts`
- Create: `tests/theme-contracts.spec.ts`

**Interfaces:**
- Consumes: public `ThemeDefinition = { id, colorScheme, tokens }` contract.
- Produces: `ThemeDefinition`, `ThemeCatalogEntry`, `NormalizedTheme`, `THEME_TOKEN_NAMES`, `REQUIRED_THEME_TOKENS`, and `CONTRAST_PAIRS` for every later task.

- [ ] **Step 1: Write failing contract invariants**

```ts
// tests/theme-contracts.spec.ts
import { describe, expect, it } from 'vitest'
import { REQUIRED_THEME_TOKENS, THEME_TOKEN_NAMES } from '../config/theme-tokens.ts'

describe('theme token contract', () => {
  it('contains only public semantic, specific, font, and shadow tokens', () => {
    expect(new Set(THEME_TOKEN_NAMES).size).toBe(THEME_TOKEN_NAMES.length)
    expect(THEME_TOKEN_NAMES.every(name => /^--dsw-(alias|specific|font|shadow)-/.test(name))).toBe(true)
    expect(REQUIRED_THEME_TOKENS.every(name => THEME_TOKEN_NAMES.includes(name))).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test and confirm missing exports**

Run: `pnpm exec vitest run tests/theme-contracts.spec.ts`

Expected: FAIL with module-not-found errors for the two new files.

- [ ] **Step 3: Define the shared data contracts**

```ts
// src/themes/contracts.ts
export type ColorScheme = 'light' | 'dark'
export type ThemeTokens = Readonly<Record<string, string>>

export interface ThemeDefinition {
  readonly id: string
  readonly colorScheme: ColorScheme
  readonly tokens: ThemeTokens
}

export interface SourceDesign {
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly colors: Readonly<Record<string, string>>
  readonly typography: Readonly<Record<string, Readonly<Record<string, unknown>>>>
  readonly sourcePath: string
  readonly sha256: string
}

export interface CanonicalPalette {
  readonly base: string
  readonly layer1: string
  readonly layer2: string
  readonly layer3: string
  readonly overlay: string
  readonly textPrimary: string
  readonly textSecondary: string
  readonly textTertiary: string
  readonly accent: string
  readonly border1: string
  readonly border2: string
  readonly success: string
  readonly warning: string
  readonly error: string
}

export interface NormalizedTheme {
  readonly slug: string
  readonly displayName: string
  readonly description: string
  readonly category: string
  readonly colorScheme: ColorScheme
  readonly palette: CanonicalPalette
  readonly fontKind: 'sans' | 'serif' | 'mono'
  readonly codeFontKind: 'mono'
  readonly shadow: 'none' | 'soft' | 'strong'
  readonly sourcePath: string
  readonly sourceSha256: string
}

export interface ThemeCatalogEntry {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly description: string
  readonly category: string
  readonly colorScheme: ColorScheme
  readonly preview: Readonly<{ base: string; layer: string; sidebar: string; text: string; accent: string }>
  readonly theme: ThemeDefinition
}
```

- [ ] **Step 4: Add the exact token and contrast contract**

`config/theme-tokens.ts` must use this exact baseline subset; expanding it requires a new Harness compatibility review:

```ts
export const REQUIRED_THEME_TOKENS = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-alias-bg-layer-3',
  '--dsw-alias-bg-overlay',
  '--dsw-alias-label-primary',
  '--dsw-alias-label-secondary',
  '--dsw-alias-label-tertiary',
  '--dsw-alias-brand-primary',
  '--dsw-alias-state-business-primary',
  '--dsw-alias-state-success-primary',
  '--dsw-alias-state-warn-primary',
  '--dsw-alias-state-error-primary',
  '--dsw-alias-border-l1',
  '--dsw-alias-border-l2',
  '--dsw-alias-interactive-bg-hover',
  '--dsw-alias-interactive-bg-active',
  '--dsw-alias-button-primary-fill',
  '--dsw-alias-button-primary-hover',
  '--dsw-alias-markdown-code-block',
  '--dsw-alias-markdown-code-block-banner',
  '--dsw-alias-markdown-inline-code',
  '--dsw-alias-markdown-tag',
  '--dsw-alias-scrollbar-bg-l1',
  '--dsw-alias-scrollbar-hover-l1',
  '--dsw-alias-tooltip-bg',
  '--dsw-specific-bubble',
  '--dsw-specific-bubble-highlight',
  '--dsw-specific-sidebar-fill',
  '--dsw-specific-sidebar-nav-item-active',
] as const

export const THEME_TOKEN_NAMES = [
  ...REQUIRED_THEME_TOKENS,
  '--dsw-font-family',
  '--dsw-font-markdown-code-font-family',
  '--dsw-font-markdown-code-block-font-family',
  '--dsw-shadow-lv1',
  '--dsw-shadow-lv1-blur',
  '--dsw-shadow-lv2',
  '--dsw-shadow-lv3',
] as const

export const CONTRAST_SURFACES = [
  '--dsw-alias-bg-base',
  '--dsw-alias-bg-layer-1',
  '--dsw-alias-bg-layer-2',
  '--dsw-specific-bubble',
  '--dsw-alias-markdown-code-block',
  '--dsw-specific-sidebar-fill',
] as const

export const CONTRAST_PAIRS = [
  ...CONTRAST_SURFACES.flatMap(surface => [
    { foreground: '--dsw-alias-label-primary', background: surface, minimum: 4.5 },
    { foreground: '--dsw-alias-label-secondary', background: surface, minimum: 4.5 },
    { foreground: '--dsw-alias-label-tertiary', background: surface, minimum: 3 },
  ]),
  ...[
    '--dsw-alias-brand-primary',
    '--dsw-alias-state-business-primary',
    '--dsw-alias-state-success-primary',
    '--dsw-alias-state-warn-primary',
    '--dsw-alias-state-error-primary',
  ].map(foreground => ({ foreground, background: '--dsw-alias-bg-base', minimum: 3 })),
] as const
```

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run tests/theme-contracts.spec.ts`

Expected: PASS.

```bash
git add src/themes/contracts.ts config/theme-tokens.ts tests/theme-contracts.spec.ts
git commit -m "feat: define generated theme contract"
```

### Task 3: Pinned Source Discovery and DESIGN.md Parsing

**Files:**
- Create: `src/themes/source.ts`
- Create: `src/themes/parse-design.ts`
- Create: `tests/fixtures/awesome-design-md/README.md`
- Create: `tests/fixtures/awesome-design-md/design-md/claude/DESIGN.md`
- Create: `tests/fixtures/awesome-design-md/design-md/voltagent/DESIGN.md`
- Create: `tests/source.spec.ts`
- Create: `tests/parse-design.spec.ts`

**Interfaces:**
- Consumes: local checkout path and expected commit.
- Produces: `discoverSource(options): Promise<DiscoveredSource>` and `parseDesign(options): Promise<SourceDesign>` with repository-relative provenance paths.

- [ ] **Step 1: Add focused failing tests for commit, categories, front matter, and hashes**

```ts
// tests/parse-design.spec.ts
import { describe, expect, it } from 'vitest'
import { parseDesign } from '../src/themes/parse-design.ts'

describe('parseDesign', () => {
  it('parses YAML front matter without reading the markdown body as YAML', async () => {
    const parsed = await parseDesign({
      root: fileURLToPath(new URL('./fixtures/awesome-design-md', import.meta.url)),
      relativePath: 'design-md/claude/DESIGN.md',
      category: 'ai-llm',
    })
    expect(parsed).toMatchObject({
      slug: 'claude',
      name: 'Claude-design-analysis',
      category: 'ai-llm',
      colors: { primary: '#cc785c', canvas: '#faf9f5' },
    })
    expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/)
  })
})
```

```ts
// tests/source.spec.ts
it('requires every design slug to have exactly one category', async () => {
  const source = await discoverSource({
    root: fixtureRoot,
    expectedCommit: 'fixture-commit',
    categoryOverrides: { slack: 'productivity-saas' },
    readCommit: async () => 'fixture-commit',
  })
  expect(source.designs.map(item => item.slug)).toEqual(['claude', 'voltagent'])
  expect(source.categories.get('claude')).toBe('ai-llm')
})
```

- [ ] **Step 2: Run tests and confirm both modules are absent**

Run: `pnpm exec vitest run tests/source.spec.ts tests/parse-design.spec.ts`

Expected: FAIL with module-not-found errors.

- [ ] **Step 3: Implement strict front-matter parsing**

`parseDesign()` must read bytes once, compute SHA-256, require an opening and closing `---`, parse only the enclosed text with `js-yaml`, reject missing `name`, `description`, `colors`, or `typography`, derive slug from the parent directory, and validate every color value as a string. Its thrown errors must start with the source path.

```ts
export interface ParseDesignOptions {
  root: string
  relativePath: string
  category: string
}

export async function parseDesign({ root, relativePath, category }: ParseDesignOptions): Promise<SourceDesign> {
  const absolutePath = resolve(root, relativePath)
  const bytes = await readFile(absolutePath)
  const text = bytes.toString('utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)
  if (match === null) throw new Error(`${relativePath}: missing closed YAML front matter`)
  const value = load(match[1]!) as Record<string, unknown>
  const colors = requireStringRecord(relativePath, 'colors', value.colors)
  const typography = requireObjectRecord(relativePath, 'typography', value.typography)
  return Object.freeze({
    slug: basename(dirname(relativePath)),
    name: requireString(relativePath, 'name', value.name),
    description: requireString(relativePath, 'description', value.description),
    category,
    colors,
    typography,
    sourcePath: relativePath.split(sep).join('/'),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  })
}
```

- [ ] **Step 4: Implement discovery and exact category coverage**

`discoverSource()` must verify `git -C <root> rev-parse HEAD`, find sorted `design-md/*/DESIGN.md`, parse Collection `###` headings and take each slug from the linked `getdesign.md/<slug>/design-md` URL, merge the explicit `categories.yaml` map, and reject duplicate, missing, or unknown slugs. Command execution uses `execFile('git', ['-C', root, 'rev-parse', 'HEAD'])`, never a shell string. Accept an optional `readCommit(root)` dependency defaulting to the git implementation so fixture tests can inject `async () => 'fixture-commit'` without creating an embedded Git repository.

- [ ] **Step 5: Verify error snapshots and commit**

Run: `pnpm exec vitest run tests/source.spec.ts tests/parse-design.spec.ts`

Expected: PASS, including wrong-commit, duplicate-category, missing-category, malformed-front-matter, and non-string-color cases.

```bash
git add src/themes/source.ts src/themes/parse-design.ts tests/fixtures tests/source.spec.ts tests/parse-design.spec.ts
git commit -m "feat: parse pinned design-md sources"
```

### Task 4: Normalization, Color Math, Overrides, and WCAG Correction

**Files:**
- Create: `src/themes/colors.ts`
- Create: `src/themes/normalize.ts`
- Create: `src/themes/overrides.ts`
- Create: `theme-overrides/categories.yaml`
- Create: `theme-overrides/themes/claude.yaml`
- Create: `theme-overrides/themes/dell-1996.yaml`
- Create: `tests/colors.spec.ts`
- Create: `tests/normalize.spec.ts`

**Interfaces:**
- Consumes: `SourceDesign` and optional sparse `ThemeOverride`.
- Produces: `normalizeTheme(source, override): NormalizedTheme`, `contrastRatio()`, and `correctForeground()`.

- [ ] **Step 1: Write failing color and normalization tests**

```ts
// tests/colors.spec.ts
it('moves only OKLCH lightness to reach AA', () => {
  const corrected = correctForeground('#777777', ['#ffffff'], 4.5)
  expect(contrastRatio(corrected, '#ffffff')).toBeGreaterThanOrEqual(4.5)
  expect(corrected).toMatch(/^#[0-9a-f]{6}$/)
})

// tests/normalize.spec.ts
it('normalizes Claude into one warm light theme', () => {
  expect(normalizeTheme(claude, claudeOverride)).toMatchObject({
    slug: 'claude',
    colorScheme: 'light',
    fontKind: 'serif',
    palette: { base: '#faf9f5', accent: '#cc785c', textPrimary: '#141413' },
  })
})
```

- [ ] **Step 2: Confirm failures before implementation**

Run: `pnpm exec vitest run tests/colors.spec.ts tests/normalize.spec.ts`

Expected: FAIL because color and normalization functions do not exist.

- [ ] **Step 3: Implement deterministic color utilities**

Use `culori` parsers/converters for hex, rgb/rgba, hsl/hsla, and OKLCH. Composite alpha colors over their target surface before contrast checks. `correctForeground(foreground, backgrounds, minimum)` must keep hue/chroma, binary-search lightness in both directions, gamut-map to sRGB, and choose the passing candidate with the smallest absolute lightness delta. Return lowercase six-digit hex. If neither direction passes every surface, throw `ContrastCorrectionError` with all measured ratios.

- [ ] **Step 4: Implement explicit normalization heuristics and sparse override schema**

```ts
export interface ThemeOverride {
  readonly reason: string
  readonly colorScheme?: 'light' | 'dark'
  readonly roles?: Readonly<Partial<Record<keyof CanonicalPalette, string>>>
  readonly sourceRoles?: Readonly<Partial<Record<keyof CanonicalPalette, string>>>
  readonly fontKind?: 'sans' | 'serif' | 'mono'
  readonly shadow?: 'none' | 'soft' | 'strong'
}
```

Normalization must use ordered source-key tables, not fuzzy model calls. For example, base checks `canvas`, `background`, `bg`, `surface-base`, `surface-black`; accent checks `primary`, `brand`, `accent`, `action`; primary text checks `ink`, `text`, `body`, `foreground`, then the best-contrast color. Missing layers derive by mixing base toward primary text at fixed 3%, 6%, and 10%. Missing borders use 14% and 24%; missing states use fixed accessible green/amber/red seeds corrected against base. Override `sourceRoles` selects a named source color; override `roles` supplies a literal final value.

Create `theme-overrides/categories.yaml` with exactly:

```yaml
slack: productivity-saas
```

The Claude override fixes `fontKind: serif`; the Dell override fixes `fontKind: serif`, `shadow: none`, and documents the retro source-role choices. Each override must contain a non-empty `reason`.

- [ ] **Step 5: Verify normal, alpha, impossible, and override cases**

Run: `pnpm exec vitest run tests/colors.spec.ts tests/normalize.spec.ts`

Expected: PASS with no snapshots depending on object key insertion order.

```bash
git add src/themes/colors.ts src/themes/normalize.ts src/themes/overrides.ts theme-overrides tests/colors.spec.ts tests/normalize.spec.ts
git commit -m "feat: normalize and correct source palettes"
```

### Task 5: Compile Canonical Themes to the Harness Token Contract

**Files:**
- Create: `src/themes/compile.ts`
- Create: `tests/compile.spec.ts`

**Interfaces:**
- Consumes: `NormalizedTheme`, `THEME_TOKEN_NAMES`, `CONTRAST_PAIRS`.
- Produces: `compileTheme(normalized): ThemeCatalogEntry` and `auditTheme(entry): ContrastFailure[]`.

- [ ] **Step 1: Write failing compile and audit tests**

```ts
it('emits a namespaced, frozen ThemeDefinition and token-derived preview', () => {
  const entry = compileTheme(normalizedClaude)
  expect(entry.id).toBe('design-md-claude')
  expect(entry.theme.colorScheme).toBe('light')
  expect(entry.preview).toEqual({
    base: entry.theme.tokens['--dsw-alias-bg-base'],
    layer: entry.theme.tokens['--dsw-alias-bg-layer-1'],
    sidebar: entry.theme.tokens['--dsw-specific-sidebar-fill'],
    text: entry.theme.tokens['--dsw-alias-label-primary'],
    accent: entry.theme.tokens['--dsw-alias-brand-primary'],
  })
  expect(Object.isFrozen(entry.theme.tokens)).toBe(true)
  expect(auditTheme(entry)).toEqual([])
})
```

- [ ] **Step 2: Run and observe missing compiler failure**

Run: `pnpm exec vitest run tests/compile.spec.ts`

Expected: FAIL with `compileTheme` missing.

- [ ] **Step 3: Implement the complete semantic mapping**

Map canonical fields to every required background, label, brand/state, border, interaction, markdown, scrollbar, tooltip, bubble, sidebar, font, and shadow token in `THEME_TOKEN_NAMES`. Derive hover/active values with fixed 8%/14% mixes. Use system font constants:

```ts
export const SYSTEM_FONTS = Object.freeze({
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  serif: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
})
```

Before returning, reject missing tokens, extra tokens, non-string values, invalid IDs, and all `CONTRAST_PAIRS` failures. Deep-freeze the entry, preview, theme, and token map.

- [ ] **Step 4: Verify the compiler and commit**

Run: `pnpm exec vitest run tests/compile.spec.ts tests/theme-contracts.spec.ts`

Expected: PASS.

```bash
git add src/themes/compile.ts tests/compile.spec.ts
git commit -m "feat: compile harness theme definitions"
```

### Task 6: Deterministic Generator, Provenance, and Checked-in 74-Theme Catalog

**Files:**
- Create: `src/themes/generate.ts`
- Create: `scripts/generate-themes.ts`
- Create: `scripts/verify-generated.ts`
- Create: `tests/generate.spec.ts`
- Generate: `src/themes/generated/themes/*.ts`
- Generate: `src/themes/generated/catalog.ts`
- Generate: `src/themes/generated/categories.ts`
- Generate: `src/themes/generated/source-manifest.json`
- Generate: `reports/contrast.json`
- Generate: `reports/sources.json`

**Interfaces:**
- Consumes: pinned local checkout, overrides, parser, normalizer, compiler.
- Produces: `generateCatalog(options): Promise<GeneratedFile[]>` plus byte-stable checked-in runtime files and reports.

- [ ] **Step 1: Write failing deterministic generation tests**

```ts
it('sorts themes by slug and produces byte-identical files twice', async () => {
  const first = await generateCatalog(fixtureOptions)
  const second = await generateCatalog(fixtureOptions)
  expect(second).toEqual(first)
  expect(first.map(file => file.path)).toEqual([...first.map(file => file.path)].sort())
})

it('writes provenance with SHA-256 source hashes', async () => {
  const files = await generateCatalog(fixtureOptions)
  const manifest = JSON.parse(files.find(file => file.path.endsWith('source-manifest.json'))!.content)
  expect(manifest).toMatchObject({ sourceCommit: 'fixture-commit', themeCount: 2 })
  expect(manifest.sources[0].sha256).toMatch(/^[a-f0-9]{64}$/)
})
```

- [ ] **Step 2: Confirm missing orchestration failure**

Run: `pnpm exec vitest run tests/generate.spec.ts`

Expected: FAIL with `generateCatalog` missing.

- [ ] **Step 3: Implement pure generation and atomic CLI writes**

`generateCatalog()` returns sorted `{ path, content }` objects without touching disk. Generated TypeScript uses JSON-stringified values, explicit `Object.freeze`, stable two-space indentation, LF endings, and a `// Generated; do not edit.` header. The CLI accepts exactly:

```text
--source <absolute-path>
--commit 8147538b4226ae41e2487a9179e3bcc1f68e8554
--output <repository-root>
```

It writes to a temporary directory under the repository, compares every expected file, then replaces only the explicit generated/report targets. It never deletes outside those targets. `verify-generated.ts` generates to a temporary directory and exits non-zero with the differing relative paths.

- [ ] **Step 4: Verify fixture generation**

Run: `pnpm exec vitest run tests/generate.spec.ts`

Expected: PASS.

- [ ] **Step 5: Materialize the pinned 74-theme catalog**

```bash
mkdir -p tmp/vendor
git clone https://github.com/VoltAgent/awesome-design-md.git tmp/vendor/awesome-design-md
git -C tmp/vendor/awesome-design-md checkout 8147538b4226ae41e2487a9179e3bcc1f68e8554
pnpm themes:generate --source "$PWD/tmp/vendor/awesome-design-md" --commit 8147538b4226ae41e2487a9179e3bcc1f68e8554 --output "$PWD"
```

Expected: exactly 74 files under `src/themes/generated/themes/`; `source-manifest.json` reports 74; `reports/contrast.json` contains zero failures. If a source role cannot be resolved, add a sparse, reasoned `theme-overrides/themes/<slug>.yaml`, rerun, and retain only overrides that change generated output.

- [ ] **Step 6: Add the full-catalog gate and commit**

```ts
// tests/generated-catalog.spec.ts
it('ships exactly the pinned 74 accessible themes', () => {
  expect(catalog).toHaveLength(74)
  expect(new Set(catalog.map(entry => entry.id)).size).toBe(74)
  expect(catalog.every(entry => auditTheme(entry).length === 0)).toBe(true)
})
```

Run: `pnpm themes:verify --source "$PWD/tmp/vendor/awesome-design-md" --commit 8147538b4226ae41e2487a9179e3bcc1f68e8554 --output "$PWD" && pnpm exec vitest run tests/generate.spec.ts tests/generated-catalog.spec.ts`

Expected: PASS and no generated diff.

```bash
git add src/themes/generate.ts scripts src/themes/generated reports theme-overrides tests/generate.spec.ts tests/generated-catalog.spec.ts
git commit -m "feat: generate pinned 74-theme catalog"
```

### Task 7: Transactional Runtime Registration and Host Settings Schema

**Files:**
- Create: `src/runtime/contracts.ts`
- Create: `src/runtime/register.ts`
- Create: `src/host/settings.ts`
- Modify: `src/index.ts`
- Create: `tests/register.spec.ts`
- Create: `tests/settings.spec.ts`

**Interfaces:**
- Consumes: generated `catalog` and public structural Theme/Settings faces.
- Produces: `registerCatalog(theme, catalog): () => void`, `THEMES_NAMESPACE`, `ThemePreferenceSettings`, and Host `apply(ctx)`.

- [ ] **Step 1: Write failing rollback and schema tests**

```ts
it('rolls back earlier registrations when a later id collides', () => {
  const disposeFirst = vi.fn()
  const theme = { register: vi.fn().mockReturnValueOnce(disposeFirst).mockImplementationOnce(() => { throw new Error('collision') }) }
  expect(() => registerCatalog(theme, twoEntries)).toThrow('collision')
  expect(disposeFirst).toHaveBeenCalledOnce()
})

it('registers only the plugin-owned settings namespace', () => {
  apply(hostContext)
  expect(register).toHaveBeenCalledWith('deepseek-harness-design-md-themes', expect.anything())
  expect(register).not.toHaveBeenCalledWith('ui-theme', expect.anything())
})
```

- [ ] **Step 2: Run and verify failures**

Run: `pnpm exec vitest run tests/register.spec.ts tests/settings.spec.ts`

Expected: FAIL with missing runtime and settings modules.

- [ ] **Step 3: Implement structural public faces and atomic registration**

```ts
export interface ThemeService {
  register(definition: ThemeDefinition): () => void
  setTheme(id: string): void
  getTheme(): ThemeSnapshot
}

export function registerCatalog(theme: Pick<ThemeService, 'register'>, entries: readonly ThemeCatalogEntry[]): () => void {
  validateRuntimeCatalog(entries)
  const disposers: Array<() => void> = []
  try {
    for (const entry of entries) disposers.push(theme.register(entry.theme))
  } catch (error) {
    for (const dispose of disposers.reverse()) dispose()
    throw error
  }
  return () => { for (const dispose of disposers.reverse()) dispose() }
}
```

Validation occurs before the first `register()` and covers count 74, unique namespaced IDs, schemes, allowlisted tokens, and string values.

- [ ] **Step 4: Implement Host settings registration**

```ts
export const THEMES_NAMESPACE = 'deepseek-harness-design-md-themes'
export const THEME_SELECTION_FIELD = 'selection'
export interface ThemePreferenceSettings { selection: string }
export const ThemePreferenceSchema = Schema.object({ selection: Schema.string().default('system') })

export const inject = ['settings'] as const
export function apply(ctx: HostContext): void {
  ctx.inject(['settings'], settingsCtx => {
    settingsCtx.settings.register(THEMES_NAMESPACE, ThemePreferenceSchema)
  })
}
```

Re-export this `apply` from `src/index.ts`; do not import Client or React code from the Host graph.

- [ ] **Step 5: Verify and commit**

Run: `pnpm exec vitest run tests/register.spec.ts tests/settings.spec.ts && pnpm run build`

Expected: PASS; `lib/index.js` contains no React or Client imports.

```bash
git add src/runtime src/host src/index.ts tests/register.spec.ts tests/settings.spec.ts
git commit -m "feat: register themes and host settings safely"
```

### Task 8: Selection Controller and Serialized Persistence

**Files:**
- Create: `src/runtime/selection.ts`
- Create: `tests/selection.spec.ts`

**Interfaces:**
- Consumes: `ThemeService`, `SettingsScope<ThemePreferenceSettings>`, own ID set.
- Produces: `createSelectionController(options): SelectionController` with `restore()`, `select(id)`, `sync(snapshot)`, `subscribe(listener)`, `getSnapshot()`, and `dispose()`.

- [ ] **Step 1: Write failing behavior tests**

Create a `makeBench()` helper in the test file that returns a controller, fake Theme service, mutable durable value, captured `setTheme` calls, captured settings writes, and deferred write resolvers. Cover all of these exact cases with concrete assertions:

```ts
it('restores an owned persisted id only over a built-in current preference', () => {
  const b = makeBench({ current: 'system', durable: 'design-md-claude' })
  b.controller.restore()
  expect(b.setTheme).toHaveBeenCalledWith('design-md-claude')
})

it('does not replace another plugin third-party preference during restore', () => {
  const b = makeBench({ current: 'other-plugin-theme', durable: 'design-md-claude' })
  b.controller.restore()
  expect(b.setTheme).not.toHaveBeenCalled()
  expect(b.controller.getSnapshot().managedByOtherPlugin).toBe(true)
})

it('serializes rapid writes in gesture order', async () => {
  const b = makeBench({ current: 'system', durable: 'system', deferredWrites: true })
  b.controller.select('design-md-claude')
  b.controller.select('design-md-voltagent')
  expect(b.settingsSet).toHaveBeenCalledTimes(1)
  b.resolveNextWrite()
  await Promise.resolve()
  expect(b.settingsSet).toHaveBeenNthCalledWith(2, 'selection', 'design-md-voltagent')
})

it('mirrors native light changes but ignores unknown third-party changes', async () => {
  const b = makeBench({ current: 'design-md-claude', durable: 'design-md-claude' })
  b.controller.sync(snapshot('light', 2))
  await b.flushWrites()
  expect(b.settingsSet).toHaveBeenLastCalledWith('selection', 'light')
  b.settingsSet.mockClear()
  b.controller.sync(snapshot('other-plugin-theme', 3))
  await b.flushWrites()
  expect(b.settingsSet).not.toHaveBeenCalled()
})

it('clears an invalid persisted id and selects system', async () => {
  const b = makeBench({ current: 'light', durable: 'removed-theme' })
  b.controller.restore()
  await b.flushWrites()
  expect(b.setTheme).toHaveBeenCalledWith('system')
  expect(b.settingsSet).toHaveBeenCalledWith('selection', 'system')
})

it('keeps the session theme and exposes retry after persistence failure', async () => {
  const b = makeBench({ current: 'system', durable: 'system', rejectWrite: true })
  b.controller.select('design-md-claude')
  await b.flushWrites()
  expect(b.setTheme).toHaveBeenCalledWith('design-md-claude')
  expect(b.controller.getSnapshot().persistence).toBe('error')
  b.allowWrites()
  b.controller.retry()
  await b.flushWrites()
  expect(b.controller.getSnapshot().persistence).toBe('idle')
})
```

- [ ] **Step 2: Run and confirm the controller is absent**

Run: `pnpm exec vitest run tests/selection.spec.ts`

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the controller state machine**

```ts
export interface SelectionState {
  readonly preference: string
  readonly activeId: string
  readonly revision: number
  readonly persistence: 'idle' | 'saving' | 'error'
  readonly errorMessage?: string
  readonly managedByOtherPlugin: boolean
}

export interface SelectionController {
  restore(): void
  select(id: string): void
  sync(snapshot: ThemeSnapshot): void
  retry(): void
  subscribe(listener: () => void): () => void
  getSnapshot(): SelectionState
  dispose(): void
}
```

The settings-scope structural face is `{ getSnapshot(), set(field, value), subscribe(listener) }`. Keep one promise queue for writes and one monotonically increasing gesture revision. Subscribe to pushed settings changes on construction and release that subscription in `dispose()`. A rejected latest write exposes `persistence: 'error'`; a rejected stale write does not replace newer state. `restore()` accepts only owned or built-in IDs. If current preference is a non-owned, non-built-in ID, set `managedByOtherPlugin: true` and skip restore. `dispose()` prevents subsequent async completions from publishing.

- [ ] **Step 4: Verify every transition and commit**

Run: `pnpm exec vitest run tests/selection.spec.ts`

Expected: PASS with fake timers disabled; promises are resolved explicitly in test order.

```bash
git add src/runtime/selection.ts tests/selection.spec.ts
git commit -m "feat: persist and arbitrate theme selection"
```

### Task 9: Gallery Filtering and External Store

**Files:**
- Create: `src/gallery/filter.ts`
- Create: `src/gallery/store.ts`
- Create: `tests/gallery-filter.spec.ts`
- Create: `tests/gallery-store.spec.ts`

**Interfaces:**
- Consumes: generated catalog, categories, `SelectionController` snapshots.
- Produces: `filterCatalog(catalog, filter): ThemeCatalogEntry[]` and `createGalleryStore()`.

- [ ] **Step 1: Write failing pure filtering and state tests**

```ts
it('searches name, slug, category and description case-insensitively', () => {
  expect(filterCatalog(catalog, { query: 'warm', scheme: 'all', category: 'all' }).map(x => x.slug)).toEqual(['claude'])
})

it('combines scheme and category filters without mutating catalog order', () => {
  expect(filterCatalog(catalog, { query: '', scheme: 'dark', category: 'ai-llm' }).map(x => x.slug)).toEqual(['voltagent'])
})
```

- [ ] **Step 2: Run and confirm missing filter/store failures**

Run: `pnpm exec vitest run tests/gallery-filter.spec.ts tests/gallery-store.spec.ts`

Expected: FAIL.

- [ ] **Step 3: Implement filter normalization and the store API**

Normalize query with `trim().toLocaleLowerCase()`. Preserve generated catalog order. The store owns only UI filters and the latest controller snapshot:

```ts
export interface GalleryState {
  readonly query: string
  readonly scheme: 'all' | 'light' | 'dark'
  readonly category: string
  readonly selection: SelectionState
}

export interface GalleryStore {
  getSnapshot(): GalleryState
  subscribe(listener: () => void): () => void
  setQuery(query: string): void
  setScheme(scheme: GalleryState['scheme']): void
  setCategory(category: string): void
  syncSelection(selection: SelectionState): void
}
```

- [ ] **Step 4: Verify and commit**

Run: `pnpm exec vitest run tests/gallery-filter.spec.ts tests/gallery-store.spec.ts`

Expected: PASS.

```bash
git add src/gallery/filter.ts src/gallery/store.ts tests/gallery-filter.spec.ts tests/gallery-store.spec.ts
git commit -m "feat: add theme gallery state and filters"
```

### Task 10: Accessible Visual Card Gallery

**Files:**
- Modify: `build/client-bundle.ts`
- Modify: `src/css-modules.d.ts`
- Create: `src/gallery/locales.ts`
- Create: `src/gallery/ThemeCard.tsx`
- Create: `src/gallery/ThemeGallery.tsx`
- Create: `src/gallery/ThemeGallery.module.css`
- Create: `tests/gallery.spec.tsx`

**Interfaces:**
- Consumes: `GalleryStore`, `SelectionController`, generated catalog/categories, slot owner `close()` (unused but accepted).
- Produces: `ThemeGallery` component registered later into `settings.section`.

- [ ] **Step 1: Write failing interaction and accessibility tests**

Create `renderGallery(overrides?)` in the test file with the real 74-entry generated catalog, a fake controller, English `t`, and a fresh store. Test the exact user-visible contract:

```tsx
it('renders 74 source cards plus Light, Dark and System in one radiogroup', () => {
  renderGallery()
  expect(screen.getAllByRole('radiogroup')).toHaveLength(1)
  expect(screen.getAllByRole('radio')).toHaveLength(77)
})

it('filters cards by search, category and scheme', () => {
  renderGallery()
  fireEvent.change(screen.getByRole('searchbox', { name: 'Search themes' }), { target: { value: 'Claude' } })
  expect(screen.getAllByRole('radio').map(node => node.textContent)).toContainEqual(expect.stringContaining('Claude'))
  expect(screen.queryByText('VoltAgent')).toBeNull()
  fireEvent.change(screen.getByLabelText('Color scheme'), { target: { value: 'dark' } })
  expect(screen.getByText('No themes match these filters.')).toBeTruthy()
})

it('marks exactly the current card checked', () => {
  renderGallery({ preference: 'design-md-claude' })
  const checked = screen.getAllByRole('radio').filter(node => node.getAttribute('aria-checked') === 'true')
  expect(checked).toHaveLength(1)
  expect(checked[0]!.textContent).toContain('Claude')
})

it('moves focus with ArrowRight and selects with Space', () => {
  const { select } = renderGallery()
  const cards = screen.getAllByRole('radio')
  ;(cards[0] as HTMLElement).focus()
  fireEvent.keyDown(cards[0]!, { key: 'ArrowRight' })
  expect(document.activeElement).toBe(cards[1])
  fireEvent.keyDown(cards[1]!, { key: ' ' })
  expect(select).toHaveBeenCalledWith(cards[1]!.getAttribute('data-theme-id'))
})

it('shows retry and external-provider states', () => {
  const { retry, rerenderSelection } = renderGallery({ persistence: 'error', errorMessage: 'write failed' })
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }))
  expect(retry).toHaveBeenCalledOnce()
  rerenderSelection({ managedByOtherPlugin: true, preference: 'other-plugin-theme' })
  expect(screen.getByText('Another plugin currently manages the active theme.')).toBeTruthy()
})
```

- [ ] **Step 2: Run and confirm component failures**

Run: `pnpm exec vitest run tests/gallery.spec.tsx`

Expected: FAIL with missing components.

- [ ] **Step 3: Implement locale dictionaries and token-derived cards**

Export complete `en` and `zh` dictionaries for title, search label/placeholder, all/light/dark filters, category label, selected text, persistence error/retry, empty results, and external-provider notice. Brand names come from generated metadata and are not translated.

`ThemeCard` must render preview blocks from `entry.preview`, never inline a Harness selector or image. Root props include:

```ts
export interface ThemeCardProps {
  entry: GalleryEntry
  checked: boolean
  tabIndex: 0 | -1
  onSelect(id: string): void
  onMove(id: string, direction: -1 | 1): void
}
```

- [ ] **Step 4: Implement the responsive gallery and scoped CSS**

`ThemeGallery` uses `useSyncExternalStore`, a toolbar with labeled search/select controls, and a `role="radiogroup"` grid. Cards use `role="radio"`, `aria-checked`, roving tab index, Enter/Space selection, and ArrowLeft/ArrowUp/ArrowRight/ArrowDown focus movement. CSS uses only local classes and public Harness semantic variables. Grid rule:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.card:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .card { transition: none; }
}
```

Extend the build helper with a `lightningcss` virtual-module plugin. A CSS Module import must expose both the hashed class map and an owned disposer:

```ts
// src/css-modules.d.ts
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export const disposeCss: () => void
  export default classes
}
```

The generated virtual module creates at most one tag whose exact
`data-plugin-css` value is
`deepseek-harness-design-md-themes/ThemeGallery.module.css`; `disposeCss()`
queries and removes only that exact owned tag. It must never select a Harness
component node or use an unqualified selector.

- [ ] **Step 5: Verify behavior, DOM isolation, and commit**

Run: `pnpm exec vitest run tests/gallery.spec.tsx`

Expected: PASS; assert no rendered class starts with a fixed global Harness component name and no `<img>`, `<iframe>`, or remote URL exists.

```bash
git add build/client-bundle.ts src/css-modules.d.ts src/gallery tests/gallery.spec.tsx
git commit -m "feat: add accessible theme card gallery"
```

### Task 11: Client Plugin Assembly and Lifecycle Integration

**Files:**
- Modify: `src/client.ts`
- Create: `tests/client.spec.ts`

**Interfaces:**
- Consumes: generated catalog, `registerCatalog`, `createSelectionController`, gallery store/component, locale dictionaries, public Context faces.
- Produces: final Client `inject` and `apply(ctx)` implementation.

- [ ] **Step 1: Write failing integration tests with a structural fake Context**

```ts
it('registers 74 themes before one settings.section contribution and restore', () => {
  const b = makeClientBench()
  apply(b.ctx)
  expect(b.registerTheme).toHaveBeenCalledTimes(74)
  expect(b.registerSection).toHaveBeenCalledTimes(1)
  expect(b.operations.indexOf('restore')).toBeGreaterThan(b.operations.lastIndexOf('register-theme'))
})

it('uses a stable id and localized label thunk', () => {
  const b = makeClientBench()
  apply(b.ctx)
  const options = b.registerSection.mock.calls[0]![0]
  expect(options.name).toBe('settings.section')
  expect(options.id).toBe('design-md-themes')
  expect(options.label()).toBe('Themes')
})

it('removes every owned contribution on dispose', () => {
  const b = makeClientBench()
  apply(b.ctx)
  b.disposeFiber()
  expect(b.themeDisposers.every(dispose => dispose.mock.calls.length === 1)).toBe(true)
  expect(b.localeDispose).toHaveBeenCalledOnce()
  expect(b.sectionDispose).toHaveBeenCalledOnce()
  expect(b.offThemeChange).toHaveBeenCalledOnce()
  expect(b.disposeStyles).toHaveBeenCalledOnce()
})

it('leaves no section when theme registration collides', () => {
  const b = makeClientBench({ collideAt: 2 })
  expect(() => apply(b.ctx)).toThrow('theme collision')
  expect(b.registerSection).not.toHaveBeenCalled()
  expect(b.themeDisposers[0]).toHaveBeenCalledOnce()
})
```

- [ ] **Step 2: Run and verify the stub Client entry fails expectations**

Run: `pnpm exec vitest run tests/client.spec.ts`

Expected: FAIL because `src/client.ts` is still the foundation stub.

- [ ] **Step 3: Assemble the Client lifecycle**

```ts
export const inject = ['theme', 'settingsScope', 'slots', 'locale'] as const

export function apply(ctx: ClientContext): void {
  ctx.effect(() => registerCatalog(ctx.theme, catalog), 'design-md-themes: register catalog')
  const scope = ctx.settingsScope.bind<ThemePreferenceSettings>({ namespace: THEMES_NAMESPACE })
  const controller = createSelectionController({
    theme: ctx.theme,
    scope,
    ownedIds: new Set(catalog.map(entry => entry.id)),
  })
  const store = createGalleryStore(controller.getSnapshot())
  ctx.effect(() => controller.subscribe(() => store.syncSelection(controller.getSnapshot())), 'design-md-themes: selection sync')
  ctx.effect(() => () => controller.dispose(), 'design-md-themes: controller')
  ctx.effect(() => ctx.locale.register('settings.design-md-themes', { en, zh }), 'design-md-themes: locale')
  ctx.effect(() => ctx.on('theme/change', snapshot => controller.sync(snapshot)), 'design-md-themes: theme listener')
  ctx.effect(() => () => disposeGalleryStyles(), 'design-md-themes: gallery styles')
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'design-md-themes',
    order: 45,
    label: () => ctx.locale.t('settings.design-md-themes', 'gallery.title'),
    inject: () => ({ catalog, categories, controller, store }),
  }, ThemeGallery))
  controller.restore()
}
```

`ThemeGallery.tsx` imports `{ disposeCss }` from its CSS Module and re-exports it as `disposeGalleryStyles`. If catalog registration throws, execution never reaches locale or slot registration.

- [ ] **Step 4: Verify integration and production build**

Run: `pnpm exec vitest run tests/client.spec.ts tests/register.spec.ts tests/selection.spec.ts tests/gallery.spec.tsx && pnpm run build`

Expected: PASS; `lib/client.js` contains the module-loader handoff and no source-path import.

```bash
git add src/client.ts tests/client.spec.ts
git commit -m "feat: assemble dsh client theme plugin"
```

### Task 12: Package Security, Documentation, and Real Harness Verification

**Files:**
- Create: `build/package-smoke.ts`
- Create: `tests/package-smoke.spec.ts`
- Create: `tests/harness-profile.e2e.spec.ts`
- Create: `README.md`
- Create: `README.zh.md`
- Create: `docs/installation.md`
- Create: `docs/maintenance.md`
- Generate: `docs/themes.md`
- Create: `LICENSE`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: final built package, pinned upstream and Harness checkouts.
- Produces: auditable tarball, user/maintainer documentation, and end-to-end compatibility evidence.

- [ ] **Step 1: Write failing tarball and profile tests**

```ts
it('ships only allowlisted runtime files', async () => {
  expect(await listTarballFiles(tarball)).toEqual(expect.arrayContaining([
    'package/lib/index.js',
    'package/lib/client.js',
    'package/cordis.patch.yml',
    'package/LICENSE',
    'package/THIRD_PARTY_NOTICES.md',
  ]))
  expect(await listTarballFiles(tarball)).not.toEqual(expect.arrayContaining([
    expect.stringMatching(/DESIGN\.md|theme-overrides|tests\/|scripts\//),
  ]))
})
```

The Harness profile test must assert `dsh --profile design-md-test --dump-config` contains exactly one `design-md-themes` row and that uninstall removes the row.

- [ ] **Step 2: Run and confirm missing smoke/docs failures**

Run: `pnpm exec vitest run tests/package-smoke.spec.ts tests/harness-profile.e2e.spec.ts`

Expected: FAIL because the smoke helper, tarball, fixture profile, and documentation do not exist.

- [ ] **Step 3: Implement the package smoke guard**

`build/package-smoke.ts` must inspect tar entries, parse `lib/index.js` and `lib/client.js`, reject absolute paths, `src/` imports, `document.querySelector` calls outside the generated style-tag ownership helper, network APIs (`fetch`, `XMLHttpRequest`, `WebSocket`), and non-allowlisted package files. It must confirm the package manifest includes the exact `dsh` block and baseline peer versions.

- [ ] **Step 4: Write complete user and maintainer documentation**

README files must include install, open Settings → Themes, search/filter/select, persistence behavior, remote-browser limitation, upgrade, remove, compatibility table, source commit, MIT attribution, trademark/non-affiliation disclaimer, and screenshots generated from theme tokens. `docs/maintenance.md` must provide the exact clone/checkout/generate/verify commands from Task 6 and explain sparse override reasons. `docs/themes.md` is generated from the catalog and lists all 74 names, IDs, categories, schemes, source paths, and adjusted-token counts.

- [ ] **Step 5: Build and install the tarball into the pinned Harness baseline**

```bash
pnpm test
pnpm themes:verify --source "$PWD/tmp/vendor/awesome-design-md" --commit 8147538b4226ae41e2487a9179e3bcc1f68e8554 --output "$PWD"
pnpm run build
pnpm pack --pack-destination .pack
dsh plugin --profile design-md-test add "$PWD/.pack/deepseek-harness-design-md-themes-0.1.0.tgz"
dsh --profile design-md-test --dump-config
```

Expected: all tests pass; generated tree is clean; tarball smoke passes; dump-config contains the bundle layer.

- [ ] **Step 6: Run real-browser compatibility checks**

Boot the pinned Harness `0.1.1-rc.2` test profile and verify through browser automation:

1. Settings has one “Themes/主题” section.
2. The gallery has 77 options: 74 generated plus Light, Dark, System.
3. Search `Claude` leaves one source card.
4. Selecting it changes body token `--dsw-alias-bg-base` to the generated Claude value.
5. Reload restores Claude in a loopback browser.
6. Selecting native System clears the third-party restore choice.
7. Browser console has no error.
8. Removing the package and rebooting removes the section and all `design-md-*` theme IDs.

- [ ] **Step 7: Run final clean verification and commit**

Run: `pnpm test && pnpm run build && pnpm run pack:check && git diff --check && git status --short`

Expected: all commands pass; status contains only the documentation/test/package files for this task before commit and is clean after commit.

```bash
git add build/package-smoke.ts tests/package-smoke.spec.ts tests/harness-profile.e2e.spec.ts README.md README.zh.md docs/installation.md docs/maintenance.md docs/themes.md LICENSE THIRD_PARTY_NOTICES.md package.json pnpm-lock.yaml
git commit -m "docs: package and verify design-md theme plugin"
```

## Final Verification Gate

- [ ] Run the full repository gate: `pnpm test && pnpm themes:verify --source "$PWD/tmp/vendor/awesome-design-md" --commit 8147538b4226ae41e2487a9179e3bcc1f68e8554 --output "$PWD" && pnpm run build && pnpm run pack:check`.
- [ ] Confirm `src/themes/generated/source-manifest.json` reports commit `8147538b4226ae41e2487a9179e3bcc1f68e8554` and `themeCount: 74`.
- [ ] Confirm `reports/contrast.json` contains no failure and documents every adjusted foreground token.
- [ ] Confirm `git grep -nE "fetch\(|XMLHttpRequest|WebSocket|querySelector\(" -- src` finds no runtime network call or Harness DOM query; the build helper's owned style-tag logic is the only documented exception outside `src`.
- [ ] Confirm a fresh tarball install and uninstall against Harness `0.1.1-rc.2` passes the eight browser checks from Task 12.
- [ ] Run `git status --short` and confirm the implementation worktree is clean.
