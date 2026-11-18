# Automated Worker tests

Copy `worker.smoke.test.ts` into `apps/tmo-api/test/` and ensure the included `vitest.config.ts` is the package Vitest config.

The suite automates:
- health and version contract checks
- TMO-106 regression at the HTTP adapter
- unsupported authorization relation behavior
- top-level LE parser rejection
- nested LE parser rejection
- malformed JSON
- wrong content type
- method handling
- 404 handling

Run from the repository root:

`npm run test:api`

Then run the complete monorepo gate:

`npm run quality`
