export default {
  testRunner: "vitest",

  mutate: [
    "src/profiles/ed/ed-authorization.ts",
    "src/profiles/ed/ed-preservation.ts",
    "src/profiles/ed/ed-collection.ts",
    "src/profiles/ed/ed-processing.ts",
    "src/profiles/ed/ed-review.ts",
    "src/profiles/ed/ed-privilege.ts",
    "src/profiles/ed/ed-redaction.ts",
    "src/profiles/ed/ed-analysis.ts",
    "src/profiles/ed/ed-request-response.ts",
    "src/profiles/ed/ed-production.ts",
    "src/profiles/ed/ed-disposition.ts",
    "src/profiles/ed/ed-to-le.ts",
    "src/profiles/ed/ed-matter-validation.ts"
  ],

  vitest: {
    related: false
  },

  reporters: [
    "clear-text",
    "progress",
    "html",
    "json"
  ],

  jsonReporter: {
    fileName: "reports/mutation/mutation.json"
  },

  htmlReporter: {
    fileName: "reports/mutation/index.html"
  },

  thresholds: {
    high: 90,
    low: 75,
    break: 70
  },

  tempDirName: "node_modules/.stryker-tmp",

  cleanTempDir: "always",

  disableBail: false,

  concurrency: 2,

  timeoutMS: 10000,
  timeoutFactor: 1.5
};
