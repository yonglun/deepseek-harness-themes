# Plugin Landing Page Implementation Plan

> Execute inline in the current task, with browser verification before delivery.

**Goal:** Create separate English and Chinese promotional pages with a working 74-theme explorer.

**Architecture:** Static HTML pages share CSS, a browser module, and compact JSON generated from the existing catalog. No runtime framework or external font service is needed.

**Tech Stack:** HTML, CSS, JavaScript modules, TypeScript catalog export, Vitest, real browser verification.

## Constraints

- Keep the existing plugin runtime, npm exports, and README hero image unchanged.
- English: `site/index.html`; Chinese: `site/zh/index.html`.
- Use relative asset URLs, and verify deployment under a project subpath.
- Preview is a simulated workspace, with real theme palette values and fictional content.
- Never claim broader compatibility than the repository documents.

## Tasks

- [x] Generate `site/assets/themes.json` through `scripts/generate-site-data.ts`; include only ID, slug, name, category, scheme, and palette. Validate unique IDs and color values before writing.
- [x] Build the bilingual pages with an editorial hero, theme-switchable workspace, eight featured selectors, complete explorer, native integration explanation, installation, FAQ, and attribution.
- [x] Add responsive shared styling, reduced-motion support, visible keyboard focus, and preview-specific theme variables.
- [x] Implement the shared browser module: palette switching, combined name/scheme/category filters, selection persistence with storage failure tolerance, copy feedback with manual fallback, and fetch failure/retry.
- [x] Add site generation and preview commands plus separate English/Chinese maintenance instructions. Preserve the existing npm package file allowlist.
- [x] Add focused checks for catalog export and combined filtering; run them alongside README/package contract tests.
- [x] Verify both languages and project subpaths in a real browser at widths 320, 768, 1024, and 1440; inspect screenshots, console errors, network failures, theme selection, reload persistence, empty results, and clipboard fallback.
- [x] Recheck Git diff, source asset hash, and relevant tests. Request the Chinese preview in the app and deliver the preview link.

## Verification commands

```sh
fnm exec --using=24.19.0 node --import tsx scripts/generate-site-data.ts
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/site.spec.ts tests/readme.spec.ts tests/package-contract.spec.ts
git diff --check
git diff --exit-code -- docs/assets/readme/hero.png
```

## Acceptance details

Selecting Binance makes the preview dark with yellow accents; selecting Claude restores the warm light palette. Search `claude` with the Dark filter yields the empty state; clearing filters restores all 74 results. Both language links remain within the served project prefix. Installation commands match README and remain selectable if clipboard access fails. All primary page copy is visible without JavaScript; interactive regions explain script requirements or loading failures.

## Verification result

TypeScript `tsc --noEmit` passed. Full Vitest suite: 22 files passed, 58 tests passed and the existing opt-in Harness profile test skipped. Focused website/README/package suite: 9 tests passed after final generation. Isolated Chrome verified both languages, four viewport widths, palette changes, persistence, 74-card expansion, combined filters, reset, category selection, project-path language links, FAQ, keyboard navigation, storage denial, clipboard fallback, load/retry, and disabled JavaScript. Normal flows had no console warnings/errors or failed network responses. Screenshots were visually inspected. The README hero remains identical to Git HEAD.

Local preview: `http://127.0.0.1:4173/zh/`. Public deployment has not been performed. The implementation is on local branch `codex/plugin-landing-page` for review.
