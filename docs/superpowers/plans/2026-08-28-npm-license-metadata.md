# npm MIT License Metadata Patch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `deepseek-harness-design-md-themes@0.1.1` so npm reports the package license as MIT.

**Architecture:** Treat the package manifest as the public release contract. Add an exact contract test before changing `package.json`, then publish the resulting immutable patch version only after local package and registry gates pass.

**Tech Stack:** JSON package manifest, Vitest, TypeScript, tsdown, npm registry, DeepSeek Harness CLI, Git.

## Global Constraints

- Declare the license with the exact SPDX identifier `MIT`.
- Release the exact patch version `0.1.1`; do not rewrite or unpublish `0.1.0`.
- Do not change `LICENSE`, third-party notices, themes, UI behavior, plugin registration, dependencies, or Harness compatibility.
- Keep explicit tarball CLI arguments authoritative; only the no-argument package-smoke default may derive a path from manifest metadata.
- Publish only through the official npm registry with account 2FA proof-of-presence.
- Keep GitHub `master` deployable and ensure the release commit is pushed before npm publication.

---

### Task 1: Lock and implement the package metadata contract

**Files:**
- Modify: `tests/package-contract.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the existing parsed `pkg` object in `tests/package-contract.spec.ts`.
- Produces: `pkg.version === '0.1.1'` and `pkg.license === 'MIT'` in both the repository and packed npm manifest.

- [ ] **Step 1: Add the failing contract assertions**

Add these assertions to the existing `is one installable dsh host/client bundle` test before the publication metadata assertions:

```ts
expect(pkg.version).toBe('0.1.1')
expect(pkg.license).toBe('MIT')
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
fnm exec --using=24.19.0 npx vitest run tests/package-contract.spec.ts
```

Expected: FAIL because the repository still has version `0.1.0` and no `license` field.

- [ ] **Step 3: Make the minimum manifest change**

Change the opening fields of `package.json` to:

```json
{
  "name": "deepseek-harness-design-md-themes",
  "version": "0.1.1",
  "description": "74 non-invasive DeepSeek Harness themes generated from awesome-design-md",
  "license": "MIT",
  "keywords": [
```

Do not modify any other manifest contract.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
fnm exec --using=24.19.0 npx vitest run tests/package-contract.spec.ts
```

Expected: one test file passes with no failures.

- [ ] **Step 5: Verify scope and commit the manifest patch**

Run:

```bash
git diff --check
git diff -- package.json tests/package-contract.spec.ts
```

Expected: only the exact version, license, and contract assertions changed.

Commit:

```bash
git add package.json tests/package-contract.spec.ts
git commit -m "fix: declare MIT license for npm"
```

### Task 2: Make package smoke version-independent

**Files:**
- Modify: `build/package-smoke.ts`
- Modify: `tests/package-smoke.spec.ts`

**Interfaces:**
- Consumes: a manifest object with `name` and `version` fields.
- Produces: `packageTarballFilename(manifest: Record<string, unknown>): string`, returning the npm tarball filename for the manifest or throwing a clear error for invalid metadata.

- [ ] **Step 1: Add the failing filename regression test**

Import `packageTarballFilename` from `build/package-smoke.ts` and add:

```ts
it('derives the tarball filename from the current manifest version', () => {
  expect(packageTarballFilename({
    name: 'deepseek-harness-design-md-themes',
    version: '9.8.7',
  })).toBe('deepseek-harness-design-md-themes-9.8.7.tgz')
})
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
fnm exec --using=24.19.0 npx vitest run tests/package-smoke.spec.ts
```

Expected: FAIL because `packageTarballFilename` is not exported.

- [ ] **Step 3: Implement manifest-driven filename resolution**

Add `readFile` from `node:fs/promises`. Export this helper:

```ts
export function packageTarballFilename(manifest: Record<string, unknown>): string {
  if (typeof manifest.name !== 'string' || typeof manifest.version !== 'string') {
    throw new Error('package manifest must declare string name and version fields')
  }
  return `${manifest.name}-${manifest.version}.tgz`
}
```

Replace the hard-coded default in `main()` with:

```ts
const manifest = JSON.parse(await readFile(resolve('package.json'), 'utf8')) as Record<string, unknown>
const tarball = input ? resolve(input) : resolve('.pack', packageTarballFilename(manifest))
```

- [ ] **Step 4: Run focused tests and the real CLI smoke check**

Run:

```bash
fnm exec --using=24.19.0 npx vitest run tests/package-smoke.spec.ts
fnm exec --using=24.19.0 node --import tsx build/package-smoke.ts
```

Expected: the focused test passes and CLI output names `deepseek-harness-design-md-themes-0.1.1.tgz`.

- [ ] **Step 5: Commit the release-tooling fix**

Run `git diff --check`, review only the helper, default-path wiring, and regression test, then commit:

```bash
git add build/package-smoke.ts tests/package-smoke.spec.ts
git commit -m "fix: derive package smoke tarball version"
```

### Task 3: Gate, integrate, publish, and verify `0.1.1`

**Files:**
- Verify only: `package.json`, `LICENSE`, `.pack/deepseek-harness-design-md-themes-0.1.1.tgz`

**Interfaces:**
- Consumes: the committed `0.1.1` package manifest from Task 1.
- Produces: public npm metadata where `version`, `dist-tags.latest`, and `license` equal `0.1.1`, `0.1.1`, and `MIT`, respectively.

- [ ] **Step 1: Run the complete local quality gates**

Run:

```bash
fnm exec --using=24.19.0 npm test -- --run
fnm exec --using=24.19.0 npx tsc -p tsconfig.json --noEmit
fnm exec --using=24.19.0 npm run build
git diff --check
```

Expected: 21 test files pass, 53 tests pass and 1 remains skipped; type checking and the host/client build exit successfully; the worktree has no uncommitted changes.

- [ ] **Step 2: Build and inspect the publish tarball**

Run:

```bash
mkdir -p .pack
NPM_CONFIG_CACHE=/tmp/dsh-npm-license-release-cache fnm exec --using=24.19.0 npm pack --pack-destination .pack
fnm exec --using=24.19.0 node --import tsx build/package-smoke.ts
NPM_CONFIG_CACHE=/tmp/dsh-npm-license-release-cache fnm exec --using=24.19.0 npm publish --dry-run --json --access public --registry=https://registry.npmjs.org/
```

Expected: the tarball is named `deepseek-harness-design-md-themes-0.1.1.tgz`; package smoke passes; dry-run reports version `0.1.1`, 115 expected public files, and no source, tests, credentials, or local absolute paths.

- [ ] **Step 3: Review and integrate the release commit**

Review correctness, readability, architecture, security, and performance. The change must remain manifest-only and add no dependencies or runtime behavior.

From the repository root, run:

```bash
git switch master
git merge --ff-only codex/fix-npm-license
fnm exec --using=24.19.0 npm test -- --run
git push origin master
```

Expected: fast-forward merge succeeds, the merged test suite passes, and GitHub `master` points to the release commit.

- [ ] **Step 4: Confirm registry preconditions and publish once**

Run:

```bash
NPM_CONFIG_CACHE=/tmp/dsh-npm-license-release-cache fnm exec --using=24.19.0 npm whoami --registry=https://registry.npmjs.org/
NPM_CONFIG_CACHE=/tmp/dsh-npm-license-release-cache fnm exec --using=24.19.0 npm view deepseek-harness-design-md-themes@0.1.1 version --registry=https://registry.npmjs.org/
NPM_CONFIG_CACHE=/tmp/dsh-npm-license-release-cache fnm exec --using=24.19.0 npm publish --access public --registry=https://registry.npmjs.org/
```

Expected: `whoami` returns `yonglun`; the pre-publish version query returns E404; npm opens the official security-key proof-of-presence flow; after approval it reports `+ deepseek-harness-design-md-themes@0.1.1`.

- [ ] **Step 5: Verify public license metadata and a clean Harness install**

Use a new literal verification root that does not already exist:

```bash
NPM_CONFIG_CACHE=/tmp/dsh-npm-license-release-cache fnm exec --using=24.19.0 npm view deepseek-harness-design-md-themes@0.1.1 name version license dist-tags.latest dist.tarball repository --json --registry=https://registry.npmjs.org/
mkdir -p /tmp/dsh-npm-license-verify-0.1.1
DSH_HOME=/tmp/dsh-npm-license-verify-0.1.1 fnm exec --using=24.19.0 dsh plugin --profile web add deepseek-harness-design-md-themes@0.1.1
DSH_HOME=/tmp/dsh-npm-license-verify-0.1.1 fnm exec --using=24.19.0 dsh --profile web --dump-config
```

Expected: public metadata reports `name: deepseek-harness-design-md-themes`, `version: 0.1.1`, `license: MIT`, and `dist-tags.latest: 0.1.1`; the isolated install succeeds and the dumped config contains `design-md-themes`.

- [ ] **Step 6: Clean release-only resources and verify final state**

Stop any interactive publish process, remove only the newly created `/tmp/dsh-npm-license-verify-0.1.1` profile, delete the fully merged `codex/fix-npm-license` branch, and run:

```bash
git status --porcelain
git rev-parse HEAD
git rev-parse origin/master
git branch --list codex/fix-npm-license
```

Expected: the repository is clean, local and remote `master` hashes match, and the temporary branch is absent.
