import { describe, expect, it } from "vitest";
import {
  assessEDReview,
  type EDReviewContext,
  type EDReviewDecisionRecord
} from "../../src/profiles/ed/ed-review.js";

const allAssessed = {
  relevance: "ASSESSED",
  responsiveness: "ASSESSED",
  privilege: "ASSESSED",
  confidentiality: "ASSESSED",
  privacy: "ASSESSED",
  issueSignificance: "ASSESSED"
} as const;

function context(): EDReviewContext {
  return {
    matterId: "matter-1",
    collectedItemIds: new Set(["item-1"]),
    sourceRecordIds: new Set(["source-1"]),
    exceptionIds: new Set(["exception-1"]),
    authorizations: [{
      id: "auth-review",
      actorId: "reviewer-1",
      matterId: "matter-1",
      action: "REVIEW",
      resourceIds: ["item-1"],
      state: "AUTHORIZED"
    }]
  };
}

function validDecision(): EDReviewDecisionRecord {
  return {
    id: "review-1",
    matterId: "matter-1",
    collectedItemId: "item-1",
    reviewedBy: "reviewer-1",
    reviewedAt: "2026-11-21T20:00:00.000Z",
    authorizationId: "auth-review",
    sourceRefs: ["source-1"],
    dimensions: allAssessed,
    responsiveness: "RESPONSIVE",
    privilege: "NOT_PRIVILEGED",
    confidentiality: "NOT_CONFIDENTIAL",
    privacy: "NOT_RESTRICTED",
    issueCodes: ["issue-contract"],
    exceptionIds: []
  };
}

describe("TMO-ED review", () => {
  it("returns REVIEWED for authorized, fully assessed review", () => {
    expect(assessEDReview(validDecision(), context()).status).toBe("REVIEWED");
  });

  it("requires an addressable collected item", () => {
    const d = { ...validDecision(), collectedItemId: "missing" };
    expect(assessEDReview(d, context()).status).toBe("INVALID");
  });

  it("requires REVIEW authorization", () => {
    const d = { ...validDecision(), authorizationId: undefined };
    expect(assessEDReview(d, context()).status).toBe("INVALID");
  });

  it("does not allow COLLECT authorization to substitute for REVIEW", () => {
    const c = context();
    const altered: EDReviewContext = {
      ...c,
      authorizations: [{ ...c.authorizations[0]!, action: "COLLECT" }]
    };
    expect(assessEDReview(validDecision(), altered).status).toBe("INVALID");
  });

  it("does not allow authorization from another actor", () => {
    const c = context();
    const altered: EDReviewContext = {
      ...c,
      authorizations: [{ ...c.authorizations[0]!, actorId: "other-reviewer" }]
    };
    expect(assessEDReview(validDecision(), altered).status).toBe("INVALID");
  });

  it("does not allow authorization to leak across collected items", () => {
    const c = context();
    const altered: EDReviewContext = {
      ...c,
      authorizations: [{ ...c.authorizations[0]!, resourceIds: ["other-item"] }]
    };
    expect(assessEDReview(validDecision(), altered).status).toBe("INVALID");
  });

  it("returns INDETERMINATE for indeterminate REVIEW authorization", () => {
    const c = context();
    const altered: EDReviewContext = {
      ...c,
      authorizations: [{ ...c.authorizations[0]!, state: "INDETERMINATE" }]
    };
    expect(assessEDReview(validDecision(), altered).status).toBe("INDETERMINATE");
  });

  it("rejects expired authorization", () => {
    const c = context();
    const altered: EDReviewContext = {
      ...c,
      authorizations: [{ ...c.authorizations[0]!, state: "EXPIRED" }]
    };
    expect(assessEDReview(validDecision(), altered).status).toBe("INVALID");
  });

  it("rejects revoked authorization", () => {
    const c = context();
    const altered: EDReviewContext = {
      ...c,
      authorizations: [{ ...c.authorizations[0]!, state: "REVOKED" }]
    };
    expect(assessEDReview(validDecision(), altered).status).toBe("INVALID");
  });

  it("keeps responsiveness separate from privilege", () => {
    const d = validDecision();
    const result = assessEDReview({ ...d, responsiveness: "RESPONSIVE", privilege: "PRIVILEGED" }, context());
    expect(result.status).toBe("REVIEWED");
  });

  it("requires a responsiveness finding when responsiveness is assessed", () => {
    const d = { ...validDecision(), responsiveness: undefined };
    expect(assessEDReview(d, context()).status).toBe("INVALID");
  });

  it("requires a privilege finding when privilege is assessed", () => {
    const d = { ...validDecision(), privilege: undefined };
    expect(assessEDReview(d, context()).status).toBe("INVALID");
  });

  it("requires issue coding when issue significance is assessed", () => {
    const d = { ...validDecision(), issueCodes: [] };
    expect(assessEDReview(d, context()).status).toBe("INVALID");
  });

  it("returns PARTIALLY_REVIEWED when only some dimensions are assessed", () => {
    const d = validDecision();
    const partial: EDReviewDecisionRecord = {
      ...d,
      dimensions: { ...allAssessed, privacy: "NOT_ASSESSED" },
      privacy: undefined
    };
    expect(assessEDReview(partial, context()).status).toBe("PARTIALLY_REVIEWED");
  });

  it("returns INDETERMINATE when a dimension is indeterminate", () => {
    const d = validDecision();
    const unresolved: EDReviewDecisionRecord = {
      ...d,
      dimensions: { ...allAssessed, relevance: "INDETERMINATE" }
    };
    expect(assessEDReview(unresolved, context()).status).toBe("INDETERMINATE");
  });

  it("returns NOT_REVIEWED when no dimension has been assessed", () => {
    const d: EDReviewDecisionRecord = {
      ...validDecision(),
      dimensions: {
        relevance: "NOT_ASSESSED",
        responsiveness: "NOT_ASSESSED",
        privilege: "NOT_ASSESSED",
        confidentiality: "NOT_ASSESSED",
        privacy: "NOT_ASSESSED",
        issueSignificance: "NOT_ASSESSED"
      },
      responsiveness: undefined,
      privilege: undefined,
      confidentiality: undefined,
      privacy: undefined,
      issueCodes: []
    };
    expect(assessEDReview(d, context()).status).toBe("NOT_REVIEWED");
  });

  it("preserves exceptions as partial review", () => {
    const d = { ...validDecision(), exceptionIds: ["exception-1"] };
    expect(assessEDReview(d, context()).status).toBe("PARTIALLY_REVIEWED");
  });

  it("rejects unknown exceptions", () => {
    const d = { ...validDecision(), exceptionIds: ["missing-exception"] };
    expect(assessEDReview(d, context()).status).toBe("INVALID");
  });

  it("rejects missing source references as a limitation rather than manufacturing support", () => {
    const d = { ...validDecision(), sourceRefs: [] };
    const result = assessEDReview(d, context());
    expect(result.status).toBe("PARTIALLY_REVIEWED");
    expect(result.limitations.length).toBeGreaterThan(0);
  });

  it("rejects references to nonexistent sources", () => {
    const d = { ...validDecision(), sourceRefs: ["missing-source"] };
    expect(assessEDReview(d, context()).status).toBe("INVALID");
  });

  it("rejects duplicate issue codes", () => {
    const d = { ...validDecision(), issueCodes: ["issue-a", "issue-a"] };
    expect(assessEDReview(d, context()).status).toBe("INVALID");
  });
});
