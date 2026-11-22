import { describe, expect, it } from "vitest";
import {
  assessCAApplicationReadiness,
  validateCAApplication,
  type CAApplicationValidationContext,
} from "../../src/profiles/ca/ca-application.js";
import type {
  CAApplication,
  CAAuthority,
  CACounterargument,
  CADoctrine,
  CAIssue,
  CAStandardOfReview,
} from "../../src/profiles/ca/ca-types.js";

const issue: CAIssue = {
  id: "issue-1", type: "CAIssue", derivationId: "d-issue", auditRef: "a-issue",
  question: "Does the challenged action violate the constitutional provision?",
  provisionIds: ["prov-1"], claimIds: ["claim-1"],
};

const authority: CAAuthority = {
  id: "auth-1", type: "CAAuthority", derivationId: "d-auth", auditRef: "a-auth",
  authorityType: "SUPREME_COURT_PRECEDENT", citation: "Example citation",
  sourceRef: "official-source", jurisdiction: "US", bindingStatus: "BINDING",
  currentStatus: "CONTROLLING", leEvidenceIds: [],
};

const doctrine: CADoctrine = {
  id: "doctrine-1", type: "CADoctrine", derivationId: "d-doctrine", auditRef: "a-doctrine",
  name: "Example doctrine", provisionIds: ["prov-1"], authorityIds: ["auth-1"],
  elementIds: ["element-1"], exceptionIds: [],
};

const standard: CAStandardOfReview = {
  id: "standard-1", type: "CAStandardOfReview", derivationId: "d-standard", auditRef: "a-standard",
  name: "Example standard", issueId: "issue-1", authorityIds: ["auth-1"], requirementIds: ["req-1"],
};

const counterargument: CACounterargument = {
  id: "counter-1", type: "CACounterargument", derivationId: "d-counter", auditRef: "a-counter",
  issueId: "issue-1", proposition: "Competing legal interpretation.", authorityIds: ["auth-1"],
  evidenceIds: [], responseIds: [], status: "SUPPORTED",
};

const context = (overrides: Partial<CAApplicationValidationContext> = {}): CAApplicationValidationContext => ({
  issues: new Map([[issue.id, issue]]),
  doctrines: new Map([[doctrine.id, doctrine]]),
  standards: new Map([[standard.id, standard]]),
  authorities: new Map([[authority.id, authority]]),
  precedents: new Map(),
  counterarguments: new Map([[counterargument.id, counterargument]]),
  leResourceIds: new Set(["le-fq-1", "le-ea-1"]),
  ...overrides,
});

const base = (overrides: Partial<CAApplication> = {}): CAApplication => ({
  id: "application-1", type: "CAApplication", derivationId: "d-app", auditRef: "a-app",
  issueId: "issue-1", doctrineId: "doctrine-1", standardOfReviewId: "standard-1",
  propositionIds: ["fact-prop-1"], factQualificationIds: ["le-fq-1"],
  epistemicAssessmentIds: ["le-ea-1"], authorityIds: ["auth-1"],
  supportingArgumentIds: ["argument-1"], counterargumentIds: [],
  ...overrides,
});

const codes = (application: CAApplication, ctx = context()) =>
  validateCAApplication(application, ctx).issues.map((entry) => entry.code);

describe("TMO-CA application validation", () => {
  it("accepts a complete application", () => {
    expect(validateCAApplication(base(), context())).toEqual({ valid: true, issues: [] });
  });

  it("rejects a missing constitutional issue", () => {
    expect(codes(base({ issueId: "missing" }))).toContain("CA_APPLICATION_ISSUE_MISSING");
  });

  it("rejects a missing doctrine", () => {
    expect(codes(base({ doctrineId: "missing" }))).toContain("CA_APPLICATION_DOCTRINE_MISSING");
  });

  it("rejects a missing standard of review when one is specified", () => {
    expect(codes(base({ standardOfReviewId: "missing" }))).toContain("CA_APPLICATION_STANDARD_MISSING");
  });

  it("allows a null standard of review", () => {
    expect(validateCAApplication(base({ standardOfReviewId: null }), context()).valid).toBe(true);
  });

  it("requires an explicit factual proposition", () => {
    expect(codes(base({ propositionIds: [] }))).toContain("CA_APPLICATION_FACTUAL_PREDICATE_MISSING");
  });

  it("requires LE fact qualification and epistemic assessment", () => {
    expect(codes(base({ factQualificationIds: [] }))).toContain("CA_APPLICATION_LE_QUALIFICATION_MISSING");
    expect(codes(base({ epistemicAssessmentIds: [] }))).toContain("CA_APPLICATION_LE_QUALIFICATION_MISSING");
  });

  it("rejects LE references absent from the qualified LE context", () => {
    expect(codes(base({ epistemicAssessmentIds: ["missing-le"] }))).toContain("CA_APPLICATION_LE_QUALIFICATION_MISSING");
  });

  it("requires legal authority in addition to qualified facts", () => {
    const result = codes(base({ authorityIds: [] }));
    expect(result).toContain("CA_APPLICATION_AUTHORITY_MISSING");
    expect(result).toContain("CA_APPLICATION_SCORE_ONLY_SHORTCUT");
  });

  it("rejects nonexistent legal authority", () => {
    expect(codes(base({ authorityIds: ["missing-auth"] }))).toContain("CA_APPLICATION_AUTHORITY_MISSING");
  });

  it("rejects nonexistent counterarguments", () => {
    expect(codes(base({ counterargumentIds: ["missing-counter"] }))).toContain("CA_APPLICATION_COUNTERARGUMENT_MISSING");
  });

  it("rejects duplicate references", () => {
    expect(codes(base({ authorityIds: ["auth-1", "auth-1"] }))).toContain("CA_APPLICATION_DUPLICATE_REFERENCE");
  });
});

describe("TMO-CA application readiness", () => {
  it("returns READY for a valid application without counterarguments", () => {
    expect(assessCAApplicationReadiness(base(), context()).readiness).toBe("READY");
  });

  it("returns READY_WITH_COUNTERARGUMENTS when material counterarguments remain attached", () => {
    expect(
      assessCAApplicationReadiness(base({ counterargumentIds: ["counter-1"] }), context()).readiness,
    ).toBe("READY_WITH_COUNTERARGUMENTS");
  });

  it("returns INDETERMINATE when qualified LE inputs cannot be resolved", () => {
    expect(
      assessCAApplicationReadiness(base(), context({ leResourceIds: new Set() })).readiness,
    ).toBe("INDETERMINATE");
  });

  it("returns INVALID for missing legal structure rather than treating it as indeterminate evidence", () => {
    expect(
      assessCAApplicationReadiness(base({ doctrineId: "missing" }), context()).readiness,
    ).toBe("INVALID");
  });

  it("never treats readiness as a constitutional merits conclusion", () => {
    const result = assessCAApplicationReadiness(base(), context());
    expect(result.readiness).toBe("READY");
    expect(result).not.toHaveProperty("direction");
    expect(result).not.toHaveProperty("constitutional");
  });
});
