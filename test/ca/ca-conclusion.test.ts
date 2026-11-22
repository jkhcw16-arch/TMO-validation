import { describe, expect, it } from "vitest";
import {
  assessCAConclusion,
  validateCAConclusion,
  type CAConclusionValidationContext,
} from "../../src/profiles/ca/ca-conclusion.js";
import type {
  CAApplication,
  CAAuthority,
  CAConclusion,
  CAIssue,
} from "../../src/profiles/ca/ca-types.js";

const issue: CAIssue = {
  id: "issue-1",
  type: "CAIssue",
  derivationId: "d-issue",
  auditRef: "a-issue",
  question: "Does the challenged action violate the constitutional provision?",
  provisionIds: ["prov-1"],
  claimIds: ["claim-1"],
};

const authority: CAAuthority = {
  id: "auth-1",
  type: "CAAuthority",
  derivationId: "d-auth",
  auditRef: "a-auth",
  authorityType: "SUPREME_COURT_PRECEDENT",
  citation: "Example citation",
  sourceRef: "official-source",
  jurisdiction: "US",
  bindingStatus: "BINDING",
  currentStatus: "CONTROLLING",
  leEvidenceIds: [],
};

const adverseAuthority: CAAuthority = {
  ...authority,
  id: "auth-adverse",
  derivationId: "d-adverse",
  auditRef: "a-adverse",
  currentStatus: "LIMITED",
};

const application: CAApplication = {
  id: "app-1",
  type: "CAApplication",
  derivationId: "d-app",
  auditRef: "a-app",
  issueId: "issue-1",
  doctrineId: "doctrine-1",
  standardOfReviewId: null,
  propositionIds: ["fact-1"],
  factQualificationIds: ["le-fq-1"],
  epistemicAssessmentIds: ["le-ea-1"],
  authorityIds: ["auth-1"],
  supportingArgumentIds: [],
  counterargumentIds: [],
};

const context = (
  overrides: Partial<CAConclusionValidationContext> = {},
): CAConclusionValidationContext => ({
  issues: new Map([[issue.id, issue]]),
  applications: new Map([[application.id, application]]),
  applicationReadiness: new Map([[application.id, "READY"]]),
  authorities: new Map([
    [authority.id, authority],
    [adverseAuthority.id, adverseAuthority],
  ]),
  precedents: new Map(),
  counterarguments: new Map(),
  ...overrides,
});

const base = (overrides: Partial<CAConclusion> = {}): CAConclusion => ({
  id: "conclusion-1",
  type: "CAConclusion",
  derivationId: "d-conclusion",
  auditRef: "a-conclusion",
  issueId: "issue-1",
  direction: "UNCONSTITUTIONAL",
  status: "SUPPORTED",
  controllingAuthorityIds: ["auth-1"],
  supportingAuthorityIds: [],
  adverseAuthorityIds: [],
  applicationIds: ["app-1"],
  limitationIds: [],
  ...overrides,
});

const codes = (conclusion: CAConclusion, ctx = context()) =>
  validateCAConclusion(conclusion, ctx).issues.map((entry) => entry.code);

describe("TMO-CA conclusion validation", () => {
  it("accepts a supported merits conclusion with ready application and authority", () => {
    expect(validateCAConclusion(base(), context())).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects a missing constitutional issue", () => {
    expect(codes(base({ issueId: "missing" }))).toContain(
      "CA_CONCLUSION_ISSUE_MISSING",
    );
  });

  it("rejects a merits direction without CAApplication", () => {
    expect(codes(base({ applicationIds: [] }))).toContain(
      "CA_CONCLUSION_SCORE_ONLY_SHORTCUT",
    );
  });

  it("rejects a nonexistent application", () => {
    expect(codes(base({ applicationIds: ["missing-app"] }))).toContain(
      "CA_CONCLUSION_APPLICATION_MISSING",
    );
  });

  it("rejects an application addressing a different issue", () => {
    const wrongIssueApplication: CAApplication = {
      ...application,
      issueId: "issue-2",
    };
    const ctx = context({
      applications: new Map([[application.id, wrongIssueApplication]]),
    });
    expect(codes(base(), ctx)).toContain(
      "CA_CONCLUSION_APPLICATION_ISSUE_MISMATCH",
    );
  });

  it("rejects an indeterminate application as a merits foundation", () => {
    const ctx = context({
      applicationReadiness: new Map([[application.id, "INDETERMINATE"]]),
    });
    expect(codes(base(), ctx)).toContain(
      "CA_CONCLUSION_APPLICATION_NOT_READY",
    );
  });

  it("accepts READY_WITH_COUNTERARGUMENTS as structurally usable", () => {
    const ctx = context({
      applicationReadiness: new Map([
        [application.id, "READY_WITH_COUNTERARGUMENTS"],
      ]),
    });
    expect(validateCAConclusion(base(), ctx).valid).toBe(true);
  });

  it("requires explicit legal authority for a merits direction", () => {
    expect(
      codes(
        base({
          controllingAuthorityIds: [],
          supportingAuthorityIds: [],
          adverseAuthorityIds: [],
        }),
      ),
    ).toContain("CA_CONCLUSION_AUTHORITY_MISSING");
  });

  it("rejects nonexistent authority references", () => {
    expect(codes(base({ controllingAuthorityIds: ["missing-auth"] }))).toContain(
      "CA_CONCLUSION_AUTHORITY_MISSING",
    );
  });

  it("requires adverse authority for a contested conclusion", () => {
    expect(codes(base({ status: "CONTESTED" }))).toContain(
      "CA_CONCLUSION_ADVERSE_AUTHORITY_MISSING",
    );
  });

  it("accepts a contested conclusion when adverse authority is preserved", () => {
    const result = validateCAConclusion(
      base({
        status: "CONTESTED",
        adverseAuthorityIds: ["auth-adverse"],
      }),
      context(),
    );
    expect(result.valid).toBe(true);
  });

  it("rejects SUPPORTED status for NO_MERITS_DETERMINATION", () => {
    expect(
      codes(
        base({
          direction: "NO_MERITS_DETERMINATION",
          status: "SUPPORTED",
          applicationIds: [],
          controllingAuthorityIds: [],
        }),
      ),
    ).toContain("CA_CONCLUSION_NO_MERITS_STATUS_INVALID");
  });

  it("rejects duplicate conclusion references", () => {
    expect(
      codes(base({ applicationIds: ["app-1", "app-1"] })),
    ).toContain("CA_CONCLUSION_DUPLICATE_REFERENCE");
  });

  it("rejects the same authority as both adverse and controlling", () => {
    expect(codes(base({ adverseAuthorityIds: ["auth-1"] }))).toContain(
      "CA_CONCLUSION_AUTHORITY_ROLE_COLLISION",
    );
  });
});

describe("TMO-CA conclusion assessment", () => {
  it("returns READY_FOR_REVIEW for a structurally valid supported merits conclusion", () => {
    expect(assessCAConclusion(base(), context()).disposition).toBe(
      "READY_FOR_REVIEW",
    );
  });

  it("returns CONTESTED_REVIEW when adverse authority remains", () => {
    expect(
      assessCAConclusion(
        base({
          status: "CONTESTED",
          adverseAuthorityIds: ["auth-adverse"],
        }),
        context(),
      ).disposition,
    ).toBe("CONTESTED_REVIEW");
  });

  it("returns NO_MERITS_DETERMINATION without converting it to a merits result", () => {
    const result = assessCAConclusion(
      base({
        direction: "NO_MERITS_DETERMINATION",
        status: "INDETERMINATE",
        applicationIds: [],
        controllingAuthorityIds: [],
      }),
      context(),
    );
    expect(result.disposition).toBe("NO_MERITS_DETERMINATION");
    expect(result.direction).toBe("NO_MERITS_DETERMINATION");
  });

  it("returns INDETERMINATE when an application is unresolved", () => {
    const ctx = context({
      applicationReadiness: new Map([[application.id, "INDETERMINATE"]]),
    });
    expect(assessCAConclusion(base(), ctx).disposition).toBe("INDETERMINATE");
  });

  it("returns INVALID when core legal authority is absent", () => {
    expect(
      assessCAConclusion(
        base({ controllingAuthorityIds: [] }),
        context(),
      ).disposition,
    ).toBe("INVALID");
  });

  it("does not manufacture or change the conclusion direction", () => {
    const result = assessCAConclusion(base(), context());
    expect(result.direction).toBe("UNCONSTITUTIONAL");
    expect(result.status).toBe("SUPPORTED");
  });
});
