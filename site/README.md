# Landing page

[中文](README.zh.md)

English page: `index.html`. Chinese page: `zh/index.html`. Shared CSS, browser modules and theme data are in `assets/`.

From the repository root:

```sh
pnpm site:generate
pnpm site:preview
```

Open [the English page](http://127.0.0.1:4173/) or [the Chinese page](http://127.0.0.1:4173/zh/). The preview server binds only to localhost. Set `SITE_PORT` to choose another port.

The server also exposes `/deepseek-harness-themes/` to verify GitHub Pages project-path behavior. Deploy the **contents of `site/`** as the static site root; no backend is needed. Opening HTML directly with `file://` cannot reliably load the theme data; use an HTTP server.

## Editing

- Copy: `scripts/site/content.en.ts` and `scripts/site/content.zh.ts`.
- HTML structure: `scripts/site/page.ts`.
- Presentation: `site/assets/style.css`.
- Behavior: `site/assets/app.js` and `site/assets/theme-utils.js`.
- Theme source: the existing `src/themes/generated/catalog.ts`.

Run `pnpm site:generate` after editing copy or the theme catalog. It regenerates both HTML files and the compact `assets/themes.json`, without writing README artwork or plugin runtime files. Commit those generated site files together with their sources.

Palette choices are previews only. They are stored in the browser under `harness-themes-site:preview`, independently of Harness settings. Storage denial does not prevent previewing. Clipboard denial falls back to selecting the installation command for manual copying. Failed theme data loading offers a retry; static introduction and installation content remain readable without JavaScript.

Public deployment is separate from local generation. No deployment workflow or live hosting configuration is changed by these commands. The npm package file allowlist excludes this website.
