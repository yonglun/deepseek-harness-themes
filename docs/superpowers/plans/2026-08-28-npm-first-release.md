# npm First Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish `deepseek-harness-design-md-themes@0.1.0` as a verified public npm package installable by DeepSeek Harness with one package-name command.

**Architecture:** Keep the runtime and bundle contract unchanged. Add only registry-facing metadata, protect it with the existing package contract test, pass the complete local release gate, publish once to the official npm Registry, then verify the exact public artifact in a fresh isolated Harness Web profile.

**Tech Stack:** Node.js 24.19.0, npm Registry, npm CLI, Vitest 4.1.8, TypeScript 6.0.3, tsdown 0.22.2, DeepSeek Harness 0.1.1-rc.2, GitHub.

## Global Constraints

- Package name remains exactly `deepseek-harness-design-md-themes`.
- Initial version remains exactly `0.1.0`.
- Registry is exactly `https://registry.npmjs.org/` and access is public.
- Source repository remains `https://github.com/yonglun/deepseek-harness-themes`.
- Do not change runtime code, exports, the `dsh` bundle contract, peer dependency versions, or README install commands.
- Do not create a Git tag, GitHub Release, trusted-publishing workflow, marketplace entry, or scoped package.
- Known precondition: `npm whoami` returned `ENEEDAUTH` while this plan was written; the user must authenticate to `https://registry.npmjs.org/` before Task 2 can pass.
- Any failing test, type check, build, dry run, smoke check, authentication check, or isolated install blocks publication.
- Never retry publication of an already-published `0.1.0`; corrections require a new semantic version.

---

### Task 1: Add registry-facing package metadata

**Files:**
- Modify: `package.json`
- Test: `tests/package-contract.spec.ts`

**Interfaces:**
- Consumes: existing parsed `pkg` object in `tests/package-contract.spec.ts`.
- Produces: npm metadata fields `repository`, `homepage`, `bugs`, `keywords`, and `publishConfig` with exact public values.

- [ ] **Step 1: Add failing metadata assertions**

Append these assertions inside the existing `is one installable dsh host/client bundle` test, after the `readme:assets` assertion:

```ts
expect(pkg.repository).toEqual({
  type: 'git',
  url: 'git+https://github.com/yonglun/deepseek-harness-themes.git',
})
expect(pkg.homepage).toBe('https://github.com/yonglun/deepseek-harness-themes#readme')
expect(pkg.bugs).toEqual({ url: 'https://github.com/yonglun/deepseek-harness-themes/issues' })
expect(pkg.keywords).toEqual([
  'deepseek',
  'deepseek-harness',
  'dsh',
  'theme',
  'themes',
  'plugin',
  'design-md',
])
expect(pkg.publishConfig).toEqual({
  access: 'public',
  registry: 'https://registry.npmjs.org/',
})
expect(pkg.private).not.toBe(true)
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/package-contract.spec.ts
```

Expected: FAIL because `pkg.repository` and the other publication fields are currently undefined.

- [ ] **Step 3: Add the exact npm metadata**

Insert these fields after `description` in `package.json`:

```json
"keywords": [
  "deepseek",
  "deepseek-harness",
  "dsh",
  "theme",
  "themes",
  "plugin",
  "design-md"
],
"homepage": "https://github.com/yonglun/deepseek-harness-themes#readme",
"bugs": {
  "url": "https://github.com/yonglun/deepseek-harness-themes/issues"
},
"repository": {
  "type": "git",
  "url": "git+https://github.com/yonglun/deepseek-harness-themes.git"
},
"publishConfig": {
  "access": "public",
  "registry": "https://registry.npmjs.org/"
},
```

- [ ] **Step 4: Run the focused test and type check**

Run:

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run tests/package-contract.spec.ts
fnm exec --using=24.19.0 ./node_modules/.bin/tsc -p tsconfig.json --noEmit
```

Expected: the package contract passes and TypeScript exits 0.

- [ ] **Step 5: Commit the metadata slice**

```bash
git add package.json tests/package-contract.spec.ts
git commit -m "chore: add npm publication metadata"
```

---

### Task 2: Pass the release gate and push the metadata commit

**Files:**
- Verify: `package.json`
- Verify: `.pack/deepseek-harness-design-md-themes-0.1.0.tgz`
- Verify: all public files selected by the package `files` list

**Interfaces:**
- Consumes: publication metadata from Task 1 and existing build/package-smoke scripts.
- Produces: a clean, pushed `master` commit and a dry-run artifact proven safe to publish.

- [ ] **Step 1: Confirm npm identity and name availability**

Run:

```bash
NPM_CONFIG_CACHE=/tmp/dsh-npm-release-cache fnm exec --using=24.19.0 npm whoami --registry=https://registry.npmjs.org/
NPM_CONFIG_CACHE=/tmp/dsh-npm-release-cache fnm exec --using=24.19.0 npm view deepseek-harness-design-md-themes version --registry=https://registry.npmjs.org/
```

Expected: `npm whoami` prints the intended npm username. The `npm view` command exits with `E404`, proving no public version exists immediately before the release gate. If either expectation differs, stop before publication.

- [ ] **Step 2: Run the full test and type-check matrix**

Run:

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/vitest run
fnm exec --using=24.19.0 ./node_modules/.bin/tsc -p tsconfig.json --noEmit
fnm exec --using=24.19.0 ./node_modules/.bin/tsc -p tsconfig.host.json
fnm exec --using=24.19.0 ./node_modules/.bin/tsc -p tsconfig.client.json
```

Expected: 21 test files pass, 51 tests pass, 1 test is skipped by design, and all TypeScript commands exit 0.

- [ ] **Step 3: Build and regenerate the release tarball**

Run:

```bash
fnm exec --using=24.19.0 ./node_modules/.bin/tsdown --config-loader tsx
NPM_CONFIG_CACHE=/tmp/dsh-npm-release-cache fnm exec --using=24.19.0 npm pack --pack-destination .pack
fnm exec --using=24.19.0 node --import tsx build/package-smoke.ts
```

Expected: tsdown emits `lib/index.js` and `lib/client.js`; npm reports a `deepseek-harness-design-md-themes-0.1.0.tgz`; package smoke prints `package smoke passed`.

- [ ] **Step 4: Inspect the npm publication dry run**

Run:

```bash
NPM_CONFIG_CACHE=/tmp/dsh-npm-release-cache fnm exec --using=24.19.0 npm publish --dry-run --json --access public --registry=https://registry.npmjs.org/
```

Expected: JSON reports package name `deepseek-harness-design-md-themes`, version `0.1.0`, and the same public file set protected by `build/package-smoke.ts`. The output must contain no `src/`, `tests/`, `tmp/`, `node_modules/`, `docs/superpowers/`, `.superpowers/`, credentials, or absolute local paths.

- [ ] **Step 5: Confirm a clean diff and push metadata to GitHub**

Run:

```bash
git diff --check
git status --short --branch
git push origin master
```

Expected: no diff errors, no uncommitted files, and GitHub reports `master` updated to the metadata commit.

---

### Task 3: Publish and verify the public npm artifact

**Files:**
- External write: npm package `deepseek-harness-design-md-themes@0.1.0`
- Temporary verification home: `/tmp/dsh-npm-verify-0.1.0`

**Interfaces:**
- Consumes: the clean, pushed, dry-run-verified package from Task 2.
- Produces: a public npm version that an isolated DeepSeek Harness Web profile can install and compose.

- [ ] **Step 1: Recheck that the version is still absent**

Run:

```bash
NPM_CONFIG_CACHE=/tmp/dsh-npm-release-cache fnm exec --using=24.19.0 npm view deepseek-harness-design-md-themes@0.1.0 version --registry=https://registry.npmjs.org/
```

Expected: `E404`. If it returns `0.1.0`, do not publish again; move directly to verification.

- [ ] **Step 2: Publish the public package once**

Run:

```bash
NPM_CONFIG_CACHE=/tmp/dsh-npm-release-cache fnm exec --using=24.19.0 npm publish --access public --registry=https://registry.npmjs.org/
```

Expected: npm prints `+ deepseek-harness-design-md-themes@0.1.0`. If npm requests an OTP or browser approval, pause for the user to complete 2FA. Any other error blocks the remaining steps.

- [ ] **Step 3: Verify the registry record**

Run:

```bash
NPM_CONFIG_CACHE=/tmp/dsh-npm-release-cache fnm exec --using=24.19.0 npm view deepseek-harness-design-md-themes@0.1.0 name version dist.tarball repository --json --registry=https://registry.npmjs.org/
```

Expected: JSON contains the exact name/version, an npm Registry tarball URL, and the GitHub repository URL.

- [ ] **Step 4: Install the public version into an isolated Web profile**

First ensure `/tmp/dsh-npm-verify-0.1.0` does not already contain a profile. If it exists, stop and choose a new literal temporary path rather than reusing state. Then run:

```bash
mkdir -p /tmp/dsh-npm-verify-0.1.0
DSH_HOME=/tmp/dsh-npm-verify-0.1.0 fnm exec --using=24.19.0 dsh plugin --profile web add deepseek-harness-design-md-themes@0.1.0
DSH_HOME=/tmp/dsh-npm-verify-0.1.0 fnm exec --using=24.19.0 dsh --profile web --dump-config
```

Expected: installation succeeds; the composed config contains a `deepseek-harness-design-md-themes` layer and the `design-md-themes` loader entry.

- [ ] **Step 5: Boot the isolated Web profile and verify browser loading**

Start the local server:

```bash
DSH_HOME=/tmp/dsh-npm-verify-0.1.0 fnm exec --using=24.19.0 dsh web --port 3091 --no-open
```

Use the `browser-testing-with-devtools` skill to open `http://127.0.0.1:3091/`, dismiss only first-run dialogs without entering credentials, open **Settings → Design MD themes**, and verify:

- the heading reports `74 source analyses · 74 generated themes`;
- exactly one `Design MD themes` settings section is present;
- selecting Claude changes the computed page background to `rgb(250, 249, 245)`;
- the browser console contains zero errors and zero warnings.

Stop the server after verification.

- [ ] **Step 6: Report the release**

Report these user-facing outputs:

```text
https://www.npmjs.com/package/deepseek-harness-design-md-themes
dsh plugin --profile web add deepseek-harness-design-md-themes
dsh web
```

Also report the published version, npm identity, isolated Harness verification result, and the fact that GitHub Release/trusted publishing remain intentionally deferred.
