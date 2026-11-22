/**
 * TMO LE proposition-evidence threshold and escalation evaluation.
 *
 * Thresholds determine policy eligibility, not truth. Hard evidence states
 * take precedence over numeric scores.
 */

export type LEQualificationStatus =
  | "UNVERIFIED"
  | "PARTIALLY_VERIFIED"
  | "VERIFIED"
  | "FAILED"
  | "INDETERMINATE";

export type LEQualificationDimension =
  | "IDENTITY"
  | "ROLE"
  | "SOURCE"
  | "PROVENANCE"
  | "TEMPORAL"
  | "ASSERTION"
  | "EVIDENCE"
  | "RELATION"
  | "AUTHORIZATION"
  | "DERIVATION";

export type LEThresholdOutcome =
  | "PASS"
  | "PASS_WITH_LIMITATIONS"
  | "HOLD"
  | "FAIL"
  | "INDETERMINATE";

export type LEEscalationLevel =
  | "NONE"
  | "REVIEW"
  | "ENHANCED_REVIEW"
  | "HOLD"
  | "BLOCK";

export interface LEThresholdPolicy {
  readonly policyId: string;
  readonly version: string;
  readonly supportThreshold: number;
  readonly strongSupportThreshold: number;
  readonly contradictionThreshold: number;
  readonly escalationReviewThreshold: number;
  readonly minimumIndependentOrigins: number;
  readonly requiredVerifiedDimensions: readonly LEQualificationDimension[];
  readonly mandatoryGateDimensions: readonly LEQualificationDimension[];
  readonly consequentialOutput: boolean;
  readonly humanReviewRequired: boolean;
}

export interface LEQualifiedDimensionResult {
  readonly dimension: LEQualificationDimension;
  readonly status: LEQualificationStatus;
}

export interface LEThresholdEvaluationInput {
  readonly resourceId: string;
  readonly propositionId: string;
  readonly score: number | null;
  readonly independentOriginCount: number | null;
  readonly dimensions: readonly LEQualifiedDimensionResult[];
  readonly hasMaterialConflict: boolean;
  readonly conflictDischarged: boolean;
  readonly hasLimitations: boolean;
  readonly authorizationVerified: boolean;
  readonly policy: LEThresholdPolicy;
}

export interface LEThresholdEvaluationResult {
  readonly outcome: LEThresholdOutcome;
  readonly escalation: LEEscalationLevel;
  readonly eligibleForEpistemicSupport: boolean;
  readonly reasons: readonly string[];
  readonly triggerRuleIds: readonly string[];
  readonly appliedPolicyId: string;
  readonly appliedPolicyVersion: string;
}

const RULE = {
  POLICY_INVALID: "T-1",
  SCORE_RANGE: "T-2",
  FAILED_GATE: "T-8",
  CONFLICT_PRECEDENCE: "T-9",
  INDETERMINATE_GATE: "T-7",
  REQUIRED_UNVERIFIED: "T-6",
  ORIGIN_MINIMUM: "T-5",
  SCORE_MISSING: "T-3",
  SUPPORT_THRESHOLD: "T-4",
  AUTHORIZATION_BOUNDARY: "E-5",
  CONSEQUENTIAL_REVIEW: "E-9",
  LIMITATIONS: "E-10",
} as const;

const finiteInRange = (value: number, minimum: number, maximum: number): boolean =>
  Number.isFinite(value) && value >= minimum && value <= maximum;

export function validateLEThresholdPolicy(policy: LEThresholdPolicy): readonly string[] {
  const errors: string[] = [];
  if (!policy.policyId.trim()) errors.push("policyId is required");
  if (!policy.version.trim()) errors.push("policy version is required");
  if (!finiteInRange(policy.supportThreshold, 0, 1)) errors.push("supportThreshold must be in [0,1]");
  if (!finiteInRange(policy.strongSupportThreshold, 0, 1)) errors.push("strongSupportThreshold must be in [0,1]");
  if (policy.supportThreshold > policy.strongSupportThreshold) errors.push("supportThreshold cannot exceed strongSupportThreshold");
  if (!finiteInRange(policy.contradictionThreshold, -1, 0) || policy.contradictionThreshold === 0) {
    errors.push("contradictionThreshold must be in [-1,0)");
  }
  if (!finiteInRange(policy.escalationReviewThreshold, 0, 1)) errors.push("escalationReviewThreshold must be in [0,1]");
  if (!Number.isSafeInteger(policy.minimumIndependentOrigins) || policy.minimumIndependentOrigins < 0) {
    errors.push("minimumIndependentOrigins must be a non-negative safe integer");
  }
  if (new Set(policy.requiredVerifiedDimensions).size !== policy.requiredVerifiedDimensions.length) {
    errors.push("requiredVerifiedDimensions cannot contain duplicates");
  }
  if (new Set(policy.mandatoryGateDimensions).size !== policy.mandatoryGateDimensions.length) {
    errors.push("mandatoryGateDimensions cannot contain duplicates");
  }
  return errors;
}

function result(
  input: LEThresholdEvaluationInput,
  outcome: LEThresholdOutcome,
  escalation: LEEscalationLevel,
  eligibleForEpistemicSupport: boolean,
  reasons: readonly string[],
  triggerRuleIds: readonly string[],
): LEThresholdEvaluationResult {
  return {
    outcome,
    escalation,
    eligibleForEpistemicSupport,
    reasons,
    triggerRuleIds,
    appliedPolicyId: input.policy.policyId,
    appliedPolicyVersion: input.policy.version,
  };
}

export function evaluateLEEvidenceThreshold(
  input: LEThresholdEvaluationInput,
): LEThresholdEvaluationResult {
  const policyErrors = validateLEThresholdPolicy(input.policy);
  if (policyErrors.length > 0) {
    return result(input, "FAIL", "BLOCK", false, policyErrors, [RULE.POLICY_INVALID]);
  }

  if (input.score !== null && !finiteInRange(input.score, -1, 1)) {
    return result(input, "FAIL", "BLOCK", false, ["score must be null or in [-1,1]"], [RULE.SCORE_RANGE]);
  }

  const dimensions = new Map(input.dimensions.map((item) => [item.dimension, item.status] as const));
  const gateStatuses = input.policy.mandatoryGateDimensions.map((dimension) => ({
    dimension,
    status: dimensions.get(dimension),
  }));

  const failedGates = gateStatuses.filter((item) => item.status === "FAILED");
  if (failedGates.length > 0) {
    return result(
      input,
      "FAIL",
      "BLOCK",
      false,
      failedGates.map((item) => `${item.dimension} mandatory gate failed`),
      [RULE.FAILED_GATE],
    );
  }

  if (input.hasMaterialConflict && !input.conflictDischarged) {
    return result(
      input,
      "HOLD",
      input.policy.consequentialOutput ? "ENHANCED_REVIEW" : "REVIEW",
      false,
      ["material conflict remains unresolved"],
      [RULE.CONFLICT_PRECEDENCE],
    );
  }

  const indeterminateGates = gateStatuses.filter(
    (item) => item.status === undefined || item.status === "INDETERMINATE",
  );
  if (indeterminateGates.length > 0) {
    return result(
      input,
      "INDETERMINATE",
      "HOLD",
      false,
      indeterminateGates.map((item) => `${item.dimension} mandatory gate is indeterminate or missing`),
      [RULE.INDETERMINATE_GATE],
    );
  }

  const notVerified = input.policy.requiredVerifiedDimensions.filter(
    (dimension) => dimensions.get(dimension) !== "VERIFIED",
  );
  if (notVerified.length > 0) {
    return result(
      input,
      "HOLD",
      "REVIEW",
      false,
      notVerified.map((dimension) => `${dimension} is required to be VERIFIED`),
      [RULE.REQUIRED_UNVERIFIED],
    );
  }

  if (input.independentOriginCount === null) {
    return result(
      input,
      "INDETERMINATE",
      "HOLD",
      false,
      ["independent origin count is unresolved"],
      [RULE.ORIGIN_MINIMUM],
    );
  }

  if (
    !Number.isSafeInteger(input.independentOriginCount) ||
    input.independentOriginCount < input.policy.minimumIndependentOrigins
  ) {
    return result(
      input,
      "HOLD",
      "REVIEW",
      false,
      [`independent origin count is below ${input.policy.minimumIndependentOrigins}`],
      [RULE.ORIGIN_MINIMUM],
    );
  }

  if (input.policy.consequentialOutput && !input.authorizationVerified) {
    return result(
      input,
      "FAIL",
      "BLOCK",
      false,
      ["authorization is not verified for a consequential output"],
      [RULE.AUTHORIZATION_BOUNDARY],
    );
  }

  if (input.score === null) {
    return result(
      input,
      "INDETERMINATE",
      "HOLD",
      false,
      ["proposition evidence score is unavailable"],
      [RULE.SCORE_MISSING],
    );
  }

  if (input.score <= input.policy.contradictionThreshold) {
    return result(
      input,
      "HOLD",
      input.policy.consequentialOutput ? "ENHANCED_REVIEW" : "REVIEW",
      false,
      ["negative score crossed the contradiction threshold"],
      [RULE.CONFLICT_PRECEDENCE],
    );
  }

  if (input.score < input.policy.supportThreshold) {
    const escalation = Math.abs(input.score) >= input.policy.escalationReviewThreshold ? "REVIEW" : "NONE";
    return result(
      input,
      "HOLD",
      escalation,
      false,
      ["support threshold was not met"],
      [RULE.SUPPORT_THRESHOLD],
    );
  }

  if (input.policy.consequentialOutput && input.policy.humanReviewRequired) {
    return result(
      input,
      input.hasLimitations ? "PASS_WITH_LIMITATIONS" : "HOLD",
      input.hasLimitations ? "REVIEW" : "ENHANCED_REVIEW",
      false,
      ["human review is required before consequential progression"],
      [RULE.CONSEQUENTIAL_REVIEW],
    );
  }

  if (input.hasLimitations) {
    return result(
      input,
      "PASS_WITH_LIMITATIONS",
      "REVIEW",
      true,
      ["threshold passed with recorded limitations"],
      [RULE.LIMITATIONS],
    );
  }

  return result(
    input,
    "PASS",
    "NONE",
    true,
    [input.score >= input.policy.strongSupportThreshold ? "strong support threshold met" : "support threshold met"],
    [RULE.SUPPORT_THRESHOLD],
  );
}

export interface LEEscalationRecord {
  readonly escalationId: string;
  readonly resourceId: string;
  readonly propositionId: string;
  readonly level: LEEscalationLevel;
  readonly triggerRuleIds: readonly string[];
  readonly triggeringResourceIds: readonly string[];
  readonly policyId: string;
  readonly policyVersion: string;
  readonly previousState: string;
  readonly resultingState: LEThresholdOutcome;
  readonly reviewerRequired: boolean;
  readonly derivationId: string;
  readonly auditRef: string;
  readonly createdAt: string;
}

export function createLEEscalationRecord(
  input: LEThresholdEvaluationInput,
  evaluation: LEThresholdEvaluationResult,
  metadata: {
    readonly escalationId: string;
    readonly triggeringResourceIds: readonly string[];
    readonly previousState: string;
    readonly derivationId: string;
    readonly auditRef: string;
    readonly createdAt: string;
  },
): LEEscalationRecord | undefined {
  if (evaluation.escalation === "NONE") return undefined;
  return {
    escalationId: metadata.escalationId,
    resourceId: input.resourceId,
    propositionId: input.propositionId,
    level: evaluation.escalation,
    triggerRuleIds: evaluation.triggerRuleIds,
    triggeringResourceIds: metadata.triggeringResourceIds,
    policyId: evaluation.appliedPolicyId,
    policyVersion: evaluation.appliedPolicyVersion,
    previousState: metadata.previousState,
    resultingState: evaluation.outcome,
    reviewerRequired: true,
    derivationId: metadata.derivationId,
    auditRef: metadata.auditRef,
    createdAt: metadata.createdAt,
  };
}
