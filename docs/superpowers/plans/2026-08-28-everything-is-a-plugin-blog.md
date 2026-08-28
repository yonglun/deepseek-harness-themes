# Everything is a Plugin Blog Article Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a source-grounded Chinese blog article that uses `deepseek-harness-design-md-themes` to explain DeepSeek Harness's「Everything is a Plugin」architecture and the practical path for developing and distributing a plugin.

**Architecture:** The article will move from a visible result, 74 themes added without modifying Harness, into the Cordis capability graph and then back out to a reusable development path. One native SVG diagram will explain the Profile, Bundle, Host, Client, and service relationships; all technical claims will be tied either to official DeepSeek Harness documentation or to the current repository implementation.

**Tech Stack:** Chinese Markdown, SVG 1.1-compatible vector markup, TypeScript excerpts from the current project, DeepSeek Harness official GitHub documentation, npm/GitHub distribution links.

## Global Constraints

- The primary audience is broad AI product and technology readers, not only TypeScript or React developers.
- The Chinese body should be approximately 4,000 to 5,000 Chinese characters, excluding code and links.
- The article must use a case-driven architecture story rather than a pure API tutorial.
- The article must not describe the project's debugging history.
- The article must not claim that the 74 themes are an official DeepSeek Harness feature.
- Official architecture claims must come from first-party DeepSeek Harness sources.
- Project claims must match package version `0.1.1`, MIT License, and the current repository implementation.
- Code examples must be clearly labeled as shortened excerpts when they omit production logic.
- No plugin code, generated theme files, README files, package metadata, or release artifacts may be changed.

---

## File Map

- Create `docs/assets/blog/everything-is-a-plugin-architecture.svg` — self-contained relationship diagram used by the article.
- Create `docs/blog/everything-is-a-plugin.zh-CN.md` — complete Chinese blog article, image references, code excerpts, installation commands, and source links.
- Do not modify `README.md`, `README.zh.md`, `package.json`, `src/**`, `tests/**`, or existing generated assets.

### Task 1: Create the plugin relationship diagram

**Files:**
- Create: `docs/assets/blog/everything-is-a-plugin-architecture.svg`

**Interfaces:**
- Consumes: the approved relationship `Profile → Bundle patch → Host Plugin / Client Plugin → Settings / Theme / Slots / Locale`.
- Produces: a self-contained SVG at `../assets/blog/everything-is-a-plugin-architecture.svg` relative to the article.

- [ ] **Step 1: Create a native SVG with the exact conceptual layers**

Use `apply_patch` to create a 1200×760 SVG with these visible labels and edges:

```text
DeepSeek Harness Profile
        ↓ loads
npm Bundle + cordis.patch.yml
        ↓ mounts
Host Plugin                    Client Plugin
    ↓ injects settings             ↓ injects theme, settingsScope, slots, locale
Settings Service              Theme Service · Settings Scope · UI Slots · Locale Service
        ↘                         ↙
         One removable capability contribution
```

Use a light neutral background, dark text, DeepSeek blue for composition edges, purple for the Host lane, and green for the Client lane. Add the caption `No Harness source modification` at the bottom. Keep all text as SVG `<text>` elements so it remains searchable and translatable.

- [ ] **Step 2: Validate the SVG syntax and labels**

Run:

```bash
xmllint --noout docs/assets/blog/everything-is-a-plugin-architecture.svg
rg -n "DeepSeek Harness Profile|cordis.patch.yml|Host Plugin|Client Plugin|Settings Service|Theme Service|UI Slots|Locale Service|No Harness source modification" docs/assets/blog/everything-is-a-plugin-architecture.svg
```

Expected: `xmllint` exits with status 0 and `rg` finds every required label.

- [ ] **Step 3: Render and inspect the diagram**

Open the SVG using the available image viewer or browser. Confirm that no labels overlap at 1200×760, arrows point from composition layers to plugin lanes, and the final contribution box is visually connected to both Host and Client.

- [ ] **Step 4: Commit the diagram**

```bash
git add docs/assets/blog/everything-is-a-plugin-architecture.svg
git diff --cached --check
git commit -m "docs: add Harness plugin architecture diagram"
```

Expected: one new SVG file and no other staged changes.

### Task 2: Write the complete case-driven article

**Files:**
- Create: `docs/blog/everything-is-a-plugin.zh-CN.md`

**Interfaces:**
- Consumes: the approved design spec, the Task 1 SVG, `docs/assets/readme/hero.png`, current project source, and first-party Harness documentation.
- Produces: one publishable Chinese Markdown article with no unresolved placeholders.

- [ ] **Step 1: Write the opening and establish the non-invasive constraint**

Begin with this concrete question, preserving its meaning while allowing natural copy editing:

```text
能不能在不修改 DeepSeek Harness 一行源码的前提下，给它装进 74 套完全不同的界面主题？
```

Within the first 500 Chinese characters:

- Show `../assets/readme/hero.png` with descriptive alt text.
- Identify the project as the independent plugin `deepseek-harness-design-md-themes`.
- State that the themes are generated from a pinned `awesome-design-md` source commit.
- Make clear that the interesting result is not merely 74 palettes, but that the capability enters and leaves Harness through its plugin mechanism.

- [ ] **Step 2: Explain「Everything is a Plugin」as a capability graph**

Cover the following official facts in conversational language:

- Cordis is the plugin framework underneath Harness.
- Model adapters, the tool registry, session log, and agent loop are plugins.
- A Context is the shared service repository.
- `inject` declares service dependencies and delays activation until dependencies exist.
- Registrations are reversible effects that unwind when the plugin unloads.

Include this shortened minimal example and label it `精简示意`:

```ts
export const name = 'my-plugin'
export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.register(/* capability */)
}
```

Immediately explain the example without requiring TypeScript knowledge: `inject` names the required capability, `apply` runs when it is ready, and registration contributes behavior to the current composition.

Insert the Task 1 diagram after this explanation:

```markdown
![从 Profile、Bundle 到 Host 与 Client 服务的插件组合关系](../assets/blog/everything-is-a-plugin-architecture.svg)
```

- [ ] **Step 3: Walk through the theme plugin's four service contributions**

Explain the case in this order:

1. Host Settings Service registers the plugin-owned `deepseek-harness-design-md-themes` namespace.
2. Client Theme Service registers all 74 `ThemeDefinition` entries.
3. UI Slots contributes the Design MD themes section to Harness Settings.
4. Locale Service registers Chinese and English interface dictionaries.

Include a shortened Host excerpt based on `src/host/settings.ts`:

```ts
export const inject = ['settings']

export function apply(ctx) {
  ctx.inject(inject, settingsCtx => {
    settingsCtx.settings.register(namespace, themePreferenceSchema)
  })
}
```

Include a shortened Client excerpt based on `src/client.ts`:

```ts
export const inject = ['theme', 'settingsScope', 'slots', 'locale']

export function apply(ctx) {
  ctx.effect(() => registerCatalog(ctx.theme, catalog))
  ctx.effect(() => registerThemeGallery(ctx.slots))
  ctx.effect(() => registerLocales(ctx.locale))
}
```

Label both as conceptual excerpts. State explicitly that `registerThemeGallery` and `registerLocales` are readability-oriented names for grouped production logic, not exports readers can copy from the repository.

- [ ] **Step 4: Explain the Host and Client boundary without frontend jargon**

Use the framing `后台登记与持久化，前台呈现与交互`.

Explain that one npm package can ship a Node-facing root entry and a browser-facing `./client` entry, while keeping their runtime dependencies separate. Tie this to the actual `main`, `exports["./client"]`, and `dsh.client` declarations in `package.json`.

Do not explain React hooks, CSS Module bundling, theme token generation, or the selection controller implementation.

- [ ] **Step 5: Explain Plugin, Bundle, and Profile with the real package metadata**

Include this shortened distribution example:

```json
{
  "main": "lib/index.js",
  "exports": {
    "./client": "./lib/client.js"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-ui-theme",
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-slots",
        "@deepseek-ai/dsh-client-locale"
      ]
    }
  }
}
```

Follow it with the actual patch shape:

```yaml
- insert:
    - id: design-md-themes
      name: deepseek-harness-design-md-themes
```

Explain the three nouns in one compact sequence: Plugin implements capability, Bundle distributes code plus a configuration layer, and Profile chooses the ordered Bundle composition for one Harness runtime.

- [ ] **Step 6: Give readers a practical development and distribution path**

Present eight numbered actions, each with a concrete outcome:

1. Define one capability and its boundaries.
2. Start with `apply(ctx)`.
3. Find the official services the capability consumes or provides.
4. Declare `inject` and register only through public service interfaces.
5. Make registrations reversible with returned disposers or `ctx.effect()`.
6. Add `dsh.bundle`, `cordis.patch.yml`, and, for Web UI, `dsh.client` plus `./client`.
7. Install into an isolated profile and inspect it with `dsh --profile web --dump-config` before starting the UI.
8. Publish prebuilt artifacts to npm and install with the exact commands below.

```bash
dsh plugin --profile web add deepseek-harness-design-md-themes
dsh web
```

Mention GitHub installation only as an alternative that may require a trusted `prepare` build and pnpm `allowBuilds`; recommend prebuilt npm artifacts for ordinary users.

- [ ] **Step 7: Close on product implications and trade-offs**

Cover both the attraction and the cost:

- Users can choose and replace system composition.
- Plugin authors can innovate without maintaining a source fork.
- Service contracts reduce coupling to concrete implementations.
- Reversible effects make unloading and reload behavior more predictable.
- Authors still carry compatibility, packaging, lifecycle, and integration-test responsibilities.

Return to the 74-theme image in the final paragraphs. End with the judgment that an Agent product's long-term differentiation may depend not only on built-in features, but also on who can recombine its capabilities and at what cost.

- [ ] **Step 8: Add direct source links**

Place links close to the supported claims and include a compact final reading list containing only these primary or project-owned sources:

```text
https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/cordis-primer.md
https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/index.md
https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md
https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-theme/README.md
https://github.com/yonglun/deepseek-harness-themes
https://www.npmjs.com/package/deepseek-harness-design-md-themes
```

- [ ] **Step 9: Run structural checks**

Run:

```bash
test -f docs/blog/everything-is-a-plugin.zh-CN.md
test -f docs/assets/readme/hero.png
test -f docs/assets/blog/everything-is-a-plugin-architecture.svg
wc -m docs/blog/everything-is-a-plugin.zh-CN.md
rg -n "Everything is a Plugin|Cordis|Context|Service|inject|Effect|Bundle|Profile|deepseek-harness-design-md-themes|dsh plugin --profile web add" docs/blog/everything-is-a-plugin.zh-CN.md
rg -n "调试|报错|加载失败|设置页空白|主题.*未生效" docs/blog/everything-is-a-plugin.zh-CN.md
```

Expected: all three files exist; the character count is consistent with a 4,000–5,000-character Chinese body plus code and links; every required concept appears; the final `rg` returns no matches.

- [ ] **Step 10: Commit the first complete article draft**

```bash
git add docs/blog/everything-is-a-plugin.zh-CN.md
git diff --cached --check
git commit -m "docs: add Everything is a Plugin case study"
```

Expected: the article is complete and publishable before the final review task begins.

### Task 3: Perform technical and editorial verification

**Files:**
- Modify: `docs/blog/everything-is-a-plugin.zh-CN.md`
- Inspect: `package.json`
- Inspect: `cordis.patch.yml`
- Inspect: `src/index.ts`
- Inspect: `src/client.ts`
- Inspect: `src/host/settings.ts`
- Inspect: `src/runtime/register.ts`

**Interfaces:**
- Consumes: the complete Task 2 article and current first-party sources.
- Produces: a fact-checked, reader-tested final article without changing its approved thesis.

- [ ] **Step 1: Verify every project claim against the repository**

Run:

```bash
node -e "const p=require('./package.json'); console.log(JSON.stringify({name:p.name,version:p.version,license:p.license,dsh:p.dsh,exports:p.exports},null,2))"
sed -n '1,80p' cordis.patch.yml
rg -n "export const inject|settings.register|registerCatalog|slots.inject|locale.register|catalog.length !== 74" src/index.ts src/client.ts src/host/settings.ts src/runtime/register.ts
```

Expected: article names and snippets agree with package `0.1.1`, MIT, the Host/Client entries, the patch row, four Client injections, and the 74-entry guard.

- [ ] **Step 2: Re-open and verify first-party Harness sources**

Use web access to verify the current official pages before finalizing. Check these exact claims:

- `docs/architecture.md` says model adapters, tool registry, session log, and agent loop are plugins and describes reversible registrations.
- `docs/cordis-primer.md` defines Context, Service, `inject`, typed events, and reversible effects.
- `docs/user/develop/basic/index.md` defines the minimal `apply(ctx)` plugin and dependency declaration.
- `docs/user/develop/basic/publish.md` defines Bundle versus Profile and npm/GitHub distribution behavior.
- `packages/client/ui-theme/README.md` documents third-party theme registration through `ctx.theme`.

Revise any wording that goes beyond those sources. Clearly label architectural interpretations as the article author's interpretation.

- [ ] **Step 3: Run the four-layer writing review**

Review the article in four passes:

```text
L1 Hard rules
- Remove cliché openings, synthetic conclusions, vague tool names, and ungrounded claims.
- Scan prose for banned phrases such as 首先、其次、最后、综上所述、值得注意的是、不难发现、说白了、本质上、换句话说、这意味着.

L2 Readability
- Confirm the opening starts with the concrete 74-theme constraint.
- Confirm paragraphs vary in length and technical sections return to the case.
- Confirm a non-React reader can follow Host, Client, Bundle, and Profile.

L3 Content quality
- Every core claim has a project detail, code excerpt, diagram, or first-party source.
- Every development step gives the reader an action and outcome.
- Trade-offs are explicit rather than hidden behind promotion.

L4 Human final read
- The voice sounds like a project author sharing a useful discovery, not a framework brochure.
- No personal scene, emotion, or dialogue has been invented.
- The article flows from visible result to architecture to action and returns to the opening image.
```

Apply all required copy edits directly to the article.

- [ ] **Step 4: Validate formatting and local media references**

Run:

```bash
git diff --check
rg -n "\.\./assets/readme/hero\.png|\.\./assets/blog/everything-is-a-plugin-architecture\.svg" docs/blog/everything-is-a-plugin.zh-CN.md
xmllint --noout docs/assets/blog/everything-is-a-plugin-architecture.svg
```

Expected: no whitespace errors, both images are referenced exactly once or more, and the SVG remains valid.

- [ ] **Step 5: Run repository verification in the user's Node.js runtime**

Run:

```bash
fnm exec --using=24.19.0 pnpm test
fnm exec --using=24.19.0 pnpm build
```

Expected: the existing test suite and build pass unchanged. If an unrelated baseline failure occurs, record it without modifying plugin code.

- [ ] **Step 6: Commit the verified final copy if review changed it**

```bash
git add docs/blog/everything-is-a-plugin.zh-CN.md
git diff --cached --check
git diff --cached --stat
git commit -m "docs: refine Everything is a Plugin article"
```

Expected: commit only when Task 3 produced editorial corrections; otherwise leave the Task 2 commit as the final article commit.

- [ ] **Step 7: Prepare the handoff**

Report:

```text
- Article path and diagram path
- Final article character count
- Official sources verified
- Test and build results
- Commits created
- Explicit confirmation that plugin code and release metadata were not changed
```
