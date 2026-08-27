# deepseek-harness-design-md-themes

An official-token, non-invasive DeepSeek Harness client plugin that brings 74 deterministic themes derived from [awesome-design-md](https://github.com/VoltAgent/awesome-design-md/tree/main/design-md) into Settings → Themes.

## Install

Install the package with the DeepSeek Harness plugin manager (or add the package to the profile's plugin list):

```bash
dsh plugin add deepseek-harness-design-md-themes
```

Restart the web client, then open **Settings → Themes**. The gallery exposes the built-in Light, Dark, and System choices plus 74 source-derived cards. Search and category filters are local and keyboard accessible; selecting a card writes only the plugin namespace `deepseek-harness-design-md-themes`.

The plugin uses the documented `dsh.client` injection list and Cordis patch entry. It registers themes through the host theme service and contributes one `settings.section`; it does not patch or replace Harness source files, global styles, or unrelated settings.

## Compatibility

- DeepSeek Harness `0.1.1-rc.2` (the peer baseline used for the generated artifact).
- Node.js `^22.19.0 || >=24.0.0` for local generation and packaging.
- React `18.2+` or `19.x` supplied by Harness.

See [docs/installation.md](docs/installation.md) for a profile-oriented install checklist and [docs/themes.md](docs/themes.md) for the complete catalog and source pins.

## Persistence and removal

The selected value is persisted under the plugin-owned namespace. Built-in `light`, `dark`, and `system` remain available even when no generated theme is selected. If another provider changes the active theme, the controller adopts that choice without writing over the provider's settings; a later local selection is retried through a serial write queue.

When the plugin is removed, its settings namespace and registered themes are no longer read by the plugin. Existing host configuration can be deleted with the Harness settings UI if desired. A remote/desktop host may scope settings to its process; this package cannot promise cross-process persistence and documents that limitation rather than modifying host storage.

## Upgrade and source maintenance

The generated output is deterministic and checked in. Source commit and file hashes are recorded in `src/themes/generated/source-manifest.json`; WCAG corrections are reported in `reports/contrast.json`. Run the commands in [docs/maintenance.md](docs/maintenance.md) when updating the pinned source repository.

## Attribution

The source analyses are derived from VoltAgent's awesome-design-md collection. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution and license notes.
