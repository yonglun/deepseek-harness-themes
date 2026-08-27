# npm First Release Design

## Goal

Publish `deepseek-harness-design-md-themes@0.1.0` as a public, unscoped package on the official npm Registry so ordinary DeepSeek Harness users can install it with:

```bash
dsh plugin --profile web add deepseek-harness-design-md-themes
```

## Decision

Use a direct local npm publication for the first release. The package name and version remain unchanged. The existing GitHub repository remains the source of truth:

- Repository: `https://github.com/yonglun/deepseek-harness-themes`
- npm package: `deepseek-harness-design-md-themes`
- Initial version: `0.1.0`
- Visibility: public
- Registry: `https://registry.npmjs.org/`

Alternatives considered:

1. **Direct npm publish — selected.** It ships the already-built `lib/` output and gives users the shortest, safest install command.
2. **GitHub Actions trusted publishing — deferred.** It is the preferred long-term release mechanism, but requires npm-side trusted-publisher configuration and a new workflow.
3. **Direct GitHub installation — rejected as the primary path.** The repository does not commit `lib/`, and adding a `prepare` build would require pnpm build permission on every user's machine.

## Package metadata

Add the following npm-facing metadata to `package.json`:

- `repository` pointing to the GitHub repository;
- `homepage` pointing to the GitHub README;
- `bugs` pointing to GitHub Issues;
- focused `keywords` for DeepSeek Harness, themes, plugins, and Design MD;
- `publishConfig.access` set to `public`;
- `publishConfig.registry` pinned to the official npm Registry.

Do not change the package name, version, exports, peer dependency baseline, bundle contract, runtime code, or README install command.

## Release gate

Before publication:

1. Confirm npm authentication with `npm whoami`.
2. Confirm the package name still returns `E404` from the public registry.
3. Run the full Vitest suite and all three TypeScript configurations on Node.js `24.19.0`.
4. Build the package and regenerate the tarball.
5. Run the existing package smoke test.
6. Inspect `npm publish --dry-run --json` and verify that no internal planning files, sources, tests, secrets, or local paths are included.
7. Commit and push the metadata change to `master` before publishing.

## Publication and verification

Publish with:

```bash
fnm exec --using=24.19.0 npm publish --access public
```

If npm requires a one-time password or browser confirmation, pause and let the user complete that authentication step. Do not bypass 2FA.

After publication:

1. Verify `npm view deepseek-harness-design-md-themes@0.1.0` resolves from the public registry.
2. Install the exact public version into a new isolated `DSH_HOME` Web profile.
3. Run `dsh --profile web --dump-config` and confirm the bundle layer is present.
4. Boot the isolated Web profile long enough to confirm the plugin loads without an import or apply error, then stop it.
5. Report the npm package URL and verified installation command.

## Failure handling

- Any test, build, dry-run, smoke, or isolated-install failure blocks publication.
- If authentication fails, no package state changes; stop and request that the user repair npm authentication.
- If the name becomes occupied before publication, do not rename automatically; request a naming decision.
- Once `0.1.0` is published, never attempt to overwrite it. Corrections require a new semantic version.

## Out of scope

- GitHub Release creation;
- Git tag creation;
- GitHub Actions or npm trusted-publisher setup;
- package renaming or scoping;
- marketplace/catalog submission.
