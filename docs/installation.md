# Installation

[Chinese](installation.zh-CN.md)

## Harness plugin manager

From an isolated profile or the profile you normally use:

```bash
dsh plugin add deepseek-harness-design-md-themes
dsh plugin list
```

For a local tarball during development, install the packaged artifact into an isolated profile:

```bash
dsh plugin --profile web add --offline /path/to/deepseek-harness-design-md-themes-0.1.0.tgz
```

Restart the web client using the normal Harness launcher, then open **Settings → Themes**. The section should appear as `design-md-themes` and show the three built-ins followed by the generated source cards.

## Local package validation

```bash
pnpm install
pnpm build
pnpm pack:check
```

`pack:check` inspects the npm tarball, verifies the exact `dsh` manifest and Cordis patch, and rejects development-only files or source-relative imports. It does not mutate a Harness profile.

## Optional real-profile smoke test

The repository includes an opt-in test for a real `dsh` profile. Use an isolated state directory and explicitly enable it:

```bash
DSH_HOME=/tmp/dsh-design-md-smoke RUN_HARNESS_E2E=1 pnpm exec vitest run tests/harness-profile.e2e.spec.ts
```

The default test run keeps this check skipped so normal CI and local development never modify a user's existing Harness state.
