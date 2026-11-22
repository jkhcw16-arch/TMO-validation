import { describe, expect, it } from "vitest";
import {
  createLEEscalationRecord,
  evaluateLEEvidenceThreshold,
  validateLEThresholdPolicy,
  type LEThresholdEvaluationInput,
  type LEThresholdPolicy,
} from "../../src/profiles/le/le-evidence-threshold-evaluation.js";

const policy: LEThresholdPolicy = {
  policyId: "policy-1",
  version: "1.0.0",
  supportThreshold: 0.6,
  strongSupportThreshold: 0.8,
  contradictionThreshold: -0.6,
  escalationReviewThreshold: 0.4,
  minimumIndependentOrigins: 2,
  requiredVerifiedDimensions: ["SOURCE", "PROVENANCE", "EVIDENCE"],
  mandatoryGateDimensions: ["PROVENANCE", "EVIDENCE"],
  consequentialOutput: false,
  humanReviewRequired: false,
};

const base = (overrides: Partial<LEThresholdEvaluationInput> = {}): LEThresholdEvaluationInput => ({
  resourceId: "resource-1",
  propositionId: "proposition-1",
  score: 0.7,
  independentOriginCount: 2,
  dimensions: [
    { dimension: "SOURCE", status: "VERIFIED" },
    { dimension: "PROVENANCE", status: "VERIFIED" },
    { dimension: "EVIDENCE", status: "VERIFIED" },
  ],
  hasMaterialConflict: false,
  conflictDischarged: false,
  hasLimitations: false,
  authorizationVerified: false,
  policy,
  ...overrides,
});

describe("LE evidence threshold policy validation", () => {
  it("accepts a valid policy", () => {
    expect(validateLEThresholdPolicy(policy)).toEqual([]);
  });

  it("rejects support threshold above strong support threshold", () => {
    const errors = validateLEThresholdPolicy({ ...policy, supportThreshold: 0.9, strongSupportThreshold: 0.8 });
    expect(errors).toContain("supportThreshold cannot exceed strongSupportThreshold");
  });

  it("rejects zero contradiction threshold", () => {
    expect(validateLEThresholdPolicy({ ...policy, contradictionThreshold: 0 })).toContain(
      "contradictionThreshold must be in [-1,0)",
    );
  });

  it("rejects duplicate dimension requirements", () => {
    expect(
      validateLEThresholdPolicy({ ...policy, requiredVerifiedDimensions: ["SOURCE", "SOURCE"] }),
    ).toContain("requiredVerifiedDimensions cannot contain duplicates");
  });
});

describe("LE evidence threshold edge cases", () => {
  it("blocks an invalid policy before evaluating the score", () => {
    const result = evaluateLEEvidenceThreshold(base({ policy: { ...policy, policyId: "" } }));
    expect(result.outcome).toBe("FAIL");
    expect(result.escalation).toBe("BLOCK");
    expect(result.triggerRuleIds).toContain("T-1");
  });

  it("blocks a score outside [-1,1]", () => {
    const result = evaluateLEEvidenceThreshold(base({ score: 1.01 }));
    expect(result.outcome).toBe("FAIL");
    expect(result.escalation).toBe("BLOCK");
    expect(result.triggerRuleIds).toContain("T-2");
  });

  it("gives a failed mandatory gate precedence over a high score", () => {
    const result = evaluateLEEvidenceThreshold(
      base({
        score: 1,
        dimensions: [
          { dimension: "SOURCE", status: "VERIFIED" },
          { dimension: "PROVENANCE", status: "FAILED" },
          { dimension: "EVIDENCE", status: "VERIFIED" },
        ],
      }),
    );
    expect(result.outcome).toBe("FAIL");
    expect(result.escalation).toBe("BLOCK");
    expect(result.eligibleForEpistemicSupport).toBe(false);
    expect(result.triggerRuleIds).toContain("T-8");
  });

  it("holds an unresolved material conflict despite a passing score", () => {
    const result = evaluateLEEvidenceThreshold(base({ score: 0.95, hasMaterialConflict: true }));
    expect(result.outcome).toBe("HOLD");
    expect(result.escalation).toBe("REVIEW");
    expect(result.triggerRuleIds).toContain("T-9");
  });

  it("allows evaluation to continue after a conflict is discharged", () => {
    const result = evaluateLEEvidenceThreshold(
      base({ score: 0.95, hasMaterialConflict: true, conflictDischarged: true }),
    );
    expect(result.outcome).toBe("PASS");
    expect(result.escalation).toBe("NONE");
  });

  it("returns indeterminate when a mandatory gate is missing", () => {
    const result = evaluateLEEvidenceThreshold(
      base({ dimensions: [{ dimension: "SOURCE", status: "VERIFIED" }, { dimension: "EVIDENCE", status: "VERIFIED" }] }),
    );
    expect(result.outcome).toBe("INDETERMINATE");
    expect(result.escalation).toBe("HOLD");
    expect(result.triggerRuleIds).toContain("T-7");
  });

  it("returns indeterminate when a mandatory gate is indeterminate", () => {
    const result = evaluateLEEvidenceThreshold(
      base({
        dimensions: [
          { dimension: "SOURCE", status: "VERIFIED" },
          { dimension: "PROVENANCE", status: "INDETERMINATE" },
          { dimension: "EVIDENCE", status: "VERIFIED" },
        ],
      }),
    );
    expect(result.outcome).toBe("INDETERMINATE");
    expect(result.triggerRuleIds).toContain("T-7");
  });

  it("holds when a required non-gate dimension is only partially verified", () => {
    const customPolicy = { ...policy, requiredVerifiedDimensions: ["SOURCE", "PROVENANCE", "EVIDENCE", "TEMPORAL"] as const };
    const result = evaluateLEEvidenceThreshold(
      base({
        policy: customPolicy,
        dimensions: [
          { dimension: "SOURCE", status: "VERIFIED" },
          { dimension: "PROVENANCE", status: "VERIFIED" },
          { dimension: "EVIDENCE", status: "VERIFIED" },
          { dimension: "TEMPORAL", status: "PARTIALLY_VERIFIED" },
        ],
      }),
    );
    expect(result.outcome).toBe("HOLD");
    expect(result.triggerRuleIds).toContain("T-6");
  });

  it("does not treat unknown origin count as zero", () => {
    const result = evaluateLEEvidenceThreshold(base({ independentOriginCount: null }));
    expect(result.outcome).toBe("INDETERMINATE");
    expect(result.escalation).toBe("HOLD");
    expect(result.triggerRuleIds).toContain("T-5");
  });

  it("holds when independent origins are below policy minimum", () => {
    const result = evaluateLEEvidenceThreshold(base({ independentOriginCount: 1 }));
    expect(result.outcome).toBe("HOLD");
    expect(result.escalation).toBe("REVIEW");
    expect(result.triggerRuleIds).toContain("T-5");
  });

  it("blocks consequential output without verified authorization", () => {
    const result = evaluateLEEvidenceThreshold(
      base({ policy: { ...policy, consequentialOutput: true }, authorizationVerified: false }),
    );
    expect(result.outcome).toBe("FAIL");
    expect(result.escalation).toBe("BLOCK");
    expect(result.triggerRuleIds).toContain("E-5");
  });

  it("does not convert a null score into contextual zero", () => {
    const result = evaluateLEEvidenceThreshold(base({ score: null }));
    expect(result.outcome).toBe("INDETERMINATE");
    expect(result.triggerRuleIds).toContain("T-3");
  });

  it("holds at the exact contradiction threshold", () => {
    const result = evaluateLEEvidenceThreshold(base({ score: policy.contradictionThreshold }));
    expect(result.outcome).toBe("HOLD");
    expect(result.escalation).toBe("REVIEW");
    expect(result.triggerRuleIds).toContain("T-9");
  });

  it("holds one representable step below support threshold", () => {
    const score = policy.supportThreshold - Number.EPSILON;
    const result = evaluateLEEvidenceThreshold(base({ score }));
    expect(result.outcome).toBe("HOLD");
    expect(result.eligibleForEpistemicSupport).toBe(false);
  });

  it("passes exactly at the support threshold", () => {
    const result = evaluateLEEvidenceThreshold(base({ score: policy.supportThreshold }));
    expect(result.outcome).toBe("PASS");
    expect(result.eligibleForEpistemicSupport).toBe(true);
  });

  it("recognizes the exact strong-support boundary", () => {
    const result = evaluateLEEvidenceThreshold(base({ score: policy.strongSupportThreshold }));
    expect(result.outcome).toBe("PASS");
    expect(result.reasons).toContain("strong support threshold met");
  });

  it("passes with limitations but escalates review", () => {
    const result = evaluateLEEvidenceThreshold(base({ hasLimitations: true }));
    expect(result.outcome).toBe("PASS_WITH_LIMITATIONS");
    expect(result.escalation).toBe("REVIEW");
    expect(result.eligibleForEpistemicSupport).toBe(true);
  });

  it("holds consequential output pending required human review", () => {
    const result = evaluateLEEvidenceThreshold(
      base({
        policy: { ...policy, consequentialOutput: true, humanReviewRequired: true },
        authorizationVerified: true,
      }),
    );
    expect(result.outcome).toBe("HOLD");
    expect(result.escalation).toBe("ENHANCED_REVIEW");
    expect(result.eligibleForEpistemicSupport).toBe(false);
    expect(result.triggerRuleIds).toContain("E-9");
  });
});

describe("LE escalation audit record", () => {
  it("does not create an escalation record for NONE", () => {
    const input = base();
    const evaluation = evaluateLEEvidenceThreshold(input);
    expect(
      createLEEscalationRecord(input, evaluation, {
        escalationId: "esc-1",
        triggeringResourceIds: ["e1"],
        previousState: "UNASSESSED",
        derivationId: "d1",
        auditRef: "audit-1",
        createdAt: "2026-11-21T00:00:00.000Z",
      }),
    ).toBeUndefined();
  });

  it("creates an auditable record when escalation occurs", () => {
    const input = base({ hasMaterialConflict: true });
    const evaluation = evaluateLEEvidenceThreshold(input);
    const record = createLEEscalationRecord(input, evaluation, {
      escalationId: "esc-1",
      triggeringResourceIds: ["e-support", "e-contradict"],
      previousState: "PARTIALLY_SUPPORTED",
      derivationId: "d-escalation",
      auditRef: "audit-1",
      createdAt: "2026-11-21T00:00:00.000Z",
    });
    expect(record).toBeDefined();
    expect(record?.level).toBe("REVIEW");
    expect(record?.reviewerRequired).toBe(true);
    expect(record?.triggerRuleIds).toContain("T-9");
    expect(record?.policyId).toBe(policy.policyId);
    expect(record?.policyVersion).toBe(policy.version);
  });
});
