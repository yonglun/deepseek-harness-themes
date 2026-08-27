# Maintenance

[Chinese](maintenance.zh-CN.md)

The source repository and commit are intentionally pinned. Generated files must be reproducible from that exact checkout.

```bash
git clone https://github.com/VoltAgent/awesome-design-md.git /tmp/awesome-design-md
git -C /tmp/awesome-design-md checkout 8147538b4226ae41e2487a9179e3bcc1f68e8554
rm -rf tmp/vendor/awesome-design-md
mkdir -p tmp/vendor
cp -R /tmp/awesome-design-md tmp/vendor/awesome-design-md
pnpm themes:generate --source tmp/vendor/awesome-design-md --commit 8147538b4226ae41e2487a9179e3bcc1f68e8554 --output .
pnpm themes:verify --source tmp/vendor/awesome-design-md --commit 8147538b4226ae41e2487a9179e3bcc1f68e8554 --output .
pnpm test
pnpm build
pnpm pack:check
```

Review `src/themes/generated/source-manifest.json`, `reports/contrast.json`, and `docs/themes.md` together. A source hash or category change is a reviewable data change. Theme overrides live in `theme-overrides/` and require a reason; they are the only checked-in exceptions to direct source mapping.

## README visual assets

Regenerate the deterministic spotlight and atlas SVGs with:

```bash
pnpm readme:assets
```

Capture the Harness settings surface from an isolated `DSH_HOME` at a 1440×900 viewport. The profile must contain no workspaces, sessions, or chat data. Compose the final `docs/assets/readme/hero.png` at 1600×900, inspect it for private content, then run `pnpm pack:check` to verify every public asset is included.
