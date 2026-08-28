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

## Verification and release

The change is accepted only when:

1. the new contract test fails before the manifest change and passes after it;
2. the full test suite, type checks, build, package smoke test, and `npm publish
   --dry-run` pass;
3. the packed `package.json` declares version `0.1.1` and license `MIT`;
4. the commit is merged and pushed to the public GitHub repository;
5. npm publishes `deepseek-harness-design-md-themes@0.1.1`, assigns `latest` to
   `0.1.1`, and reports `license: MIT` through the public registry.

If npm requires proof-of-presence, the publish pauses at the official security
key flow. No bypass-2FA token or reduced account security is introduced.

## Non-goals

- changing the text or copyright notice in `LICENSE`;
- changing third-party attribution or licensing;
- altering themes, UI behavior, plugin registration, or Harness compatibility;
- rewriting or unpublishing `0.1.0`.
