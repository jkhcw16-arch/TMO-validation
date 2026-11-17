# TMO validation

TypeScript validation implementation with Vitest and fast-check property tests.

## Local commands

```bash
npm install
npm run typecheck
npm test
npm run test:property
npm run test:fuzz
npm run test:ci
```

For CI-equivalent execution after a lock file exists:

```bash
./scripts/ci.sh
```

## CI

`.github/workflows/ci.yml` runs type checking and tests across the configured Node.js matrix, then produces a V8 coverage report and uploads the `coverage/` directory as a workflow artifact.

Source is under `src/validation/`; property tests and fast-check arbitraries are under `test/property/`.

## npm publishing

The release workflow also publishes the package to the public npm registry after release verification.

Before enabling publishing:

1. Replace `@jamiekinney/tmo-validation` in `package.json` with the intended npm package name.
2. Set `package.json` `version` to the semantic version represented by the release tag.
3. On npm, configure this repository's `.github/workflows/release.yml` as a trusted publisher.

Stable release tags publish with the `latest` npm dist-tag. Hyphenated prerelease versions publish with the `next` dist-tag.

Inspect package contents without publishing:

```bash
npm run publish:dry-run
```

## Provenance verification

The release workflow verifies npm registry signatures/provenance with `npm audit signatures` and then checks that the newly published package version exposes an npm provenance/SLSA attestation.

Local checks:

```bash
npm run provenance:dependencies
npm run provenance:published -- @jamiekinney/tmo-validation 1.0.0
```

Trusted Publishing must be configured for `.github/workflows/release.yml` on npm before the publish job can use OIDC.

## License

Copyright (c) 2026 Jamie Kinney. All rights reserved. This project is proprietary. See `LICENSE`.
