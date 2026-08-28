# npm MIT License Metadata Patch Design

## Goal

Make npm display the package license as MIT, matching the repository's existing
`LICENSE` file, without changing any DeepSeek Harness runtime behavior.

## Current state

`deepseek-harness-design-md-themes@0.1.0` includes an MIT `LICENSE` file but its
`package.json` does not declare a `license` field. npm therefore reports the
license as `none`. Published npm versions are immutable, so correcting the
registry metadata requires a new patch release.

## Chosen approach

Publish `0.1.1` with these package-manifest changes:

- add the SPDX declaration `"license": "MIT"`;
- increment `version` from `0.1.0` to `0.1.1`;
- extend the package-contract test to require both values.

The existing MIT `LICENSE`, bilingual documentation, third-party notices,
theme catalog, generated assets, plugin entry points, and dependency contract
remain unchanged.

## Release smoke compatibility

The release gate currently defaults to a tarball filename containing the
literal version `0.1.0`. That makes every later release fail package smoke even
when npm produces the correct artifact. The no-argument smoke path will instead
derive the tarball filename from the current manifest's `name` and `version`.
An explicit CLI tarball argument remains authoritative so callers can still
inspect any chosen archive.

Filename derivation will be isolated in a pure exported helper and covered with
a version-independent regression test. Missing or non-string manifest fields
will fail with a clear error rather than resolving an ambiguous path. This is a
release-tooling correction only; it is not bundled into the published plugin.

## Verification and release

The change is accepted only when:

1. the new contract test fails before the manifest change and passes after it;
2. the smoke-path regression test fails with the hard-coded `0.1.0` behavior
   and passes when the tarball name follows the current manifest;
3. the full test suite, type checks, build, package smoke test, and `npm publish
   --dry-run` pass;
4. the packed `package.json` declares version `0.1.1` and license `MIT`;
5. the commit is merged and pushed to the public GitHub repository;
6. npm publishes `deepseek-harness-design-md-themes@0.1.1`, assigns `latest` to
   `0.1.1`, and reports `license: MIT` through the public registry.

If npm requires proof-of-presence, the publish pauses at the official security
key flow. No bypass-2FA token or reduced account security is introduced.

## Non-goals

- changing the text or copyright notice in `LICENSE`;
- changing third-party attribution or licensing;
- altering themes, UI behavior, plugin registration, or Harness compatibility;
- rewriting or unpublishing `0.1.0`.
