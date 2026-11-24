/**
 * TMO-ED Review evaluator.
 *
 * Review dimensions remain independent. Review classification does not establish
 * evidentiary truth, authenticity, admissibility, privilege, or legal merits.
 */

export type EDReviewStatus =
  | "REVIEWED"
  | "PARTIALLY_REVIEWED"
  | "NOT_REVIEWED"
  | "INDETERMINATE"
  | "INVALID";

export type EDReviewDimensionStatus =
  | "ASSESSED"
  | "NOT_ASSESSED"
  | "INDETERMINATE";

export type EDResponsivenessStatus =
  | "RESPONSIVE"
  | "NOT_RESPONSIVE"
  | "INDETERMINATE";

export type EDPrivilegeReviewStatus =
  | "PRIVILEGED"
  | "NOT_PRIVILEGED"
  | "POTENTIALLY_PRIVILEGED"
  | "CONTESTED"
  | "INDETERMINATE";

export type EDConfidentialityStatus =
  | "CONFIDENTIAL"
  | "NOT_CONFIDENTIAL"
  | "INDETERMINATE";

export type EDPrivacyStatus =
  | "RESTRICTED"
  | "NOT_RESTRICTED"
  | "INDETERMINATE";

export interface EDReviewDimensions {
  readonly relevance: EDReviewDimensionStatus;
  readonly responsiveness: EDReviewDimensionStatus;
  readonly privilege: EDReviewDimensionStatus;
  readonly confidentiality: EDReviewDimensionStatus;
  readonly privacy: EDReviewDimensionStatus;
  readonly issueSignificance: EDReviewDimensionStatus;
}

export interface EDReviewDecisionRecord {
  readonly id: string;
  readonly matterId: string;
  readonly collectedItemId: string;
  readonly reviewedBy: string;
  readonly reviewedAt?: string;
  readonly authorizationId?: string;
  readonly sourceRefs: readonly string[];
  readonly dimensions: EDReviewDimensions;
  readonly responsiveness?: EDResponsivenessStatus;
  readonly privilege?: EDPrivilegeReviewStatus;
  readonly confidentiality?: EDConfidentialityStatus;
  readonly privacy?: EDPrivacyStatus;
  readonly issueCodes: readonly string[];
  readonly exceptionIds: readonly string[];
}

export interface EDReviewAuthorizationRecord {
  readonly id: string;
  readonly actorId: string;
  readonly matterId: string;
  readonly action: string;
  readonly resourceIds: readonly string[];
  readonly state:
    | "AUTHORIZED"
    | "AUTHORIZED_WITH_LIMITATIONS"
    | "NOT_AUTHORIZED"
    | "EXPIRED"
    | "REVOKED"
    | "INDETERMINATE";
}

export interface EDReviewContext {
  readonly matterId: string;
  readonly collectedItemIds: ReadonlySet<string>;
  readonly sourceRecordIds: ReadonlySet<string>;
  readonly exceptionIds: ReadonlySet<string>;
  readonly authorizations: readonly EDReviewAuthorizationRecord[];
}

export interface EDReviewAssessment {
  readonly reviewDecisionId: string;
  readonly collectedItemId: string;
  readonly status: EDReviewStatus;
  readonly dimensions: EDReviewDimensions;
  readonly reasons: readonly string[];
  readonly limitations: readonly string[];
}

export const ED_REVIEW_INVARIANTS = {
  "ED-REV-101": "Review remains traceable to a collected item and addressable sources.",
  "ED-REV-102": "REVIEW authorization is action-, actor-, matter-, and resource-specific.",
  "ED-REV-103": "Relevance, responsiveness, privilege, confidentiality, privacy, and issue significance remain separate dimensions.",
  "ED-REV-104": "Responsiveness does not establish truth, authenticity, admissibility, privilege, or legal merits.",
  "ED-REV-105": "Privilege assessment does not substitute for responsiveness, and responsiveness does not substitute for privilege assessment.",
  "ED-REV-106": "Unknown review state remains INDETERMINATE; partial and exceptional review remains explicit."
} as const;

function validTimestamp(value: string | undefined): boolean {
  return value !== undefined && Number.isFinite(Date.parse(value));
}

function duplicate(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function dimensionSummary(dimensions: EDReviewDimensions) {
  const values = Object.values(dimensions);
  return {
    assessed: values.filter((v) => v === "ASSESSED").length,
    unassessed: values.filter((v) => v === "NOT_ASSESSED").length,
    indeterminate: values.filter((v) => v === "INDETERMINATE").length,
    total: values.length
  };
}

function reviewAuthorization(
  decision: EDReviewDecisionRecord,
  context: EDReviewContext
): EDReviewAuthorizationRecord | undefined {
  if (!decision.authorizationId) return undefined;
  return context.authorizations.find((a) => a.id === decision.authorizationId);
}

export function assessEDReview(
  decision: EDReviewDecisionRecord,
  context: EDReviewContext
): EDReviewAssessment {
  const reasons: string[] = [];
  const limitations: string[] = [];

  if (!decision.id.trim() || !decision.reviewedBy.trim()) {
    reasons.push("Review decision ID and reviewer are required.");
  }

  if (decision.matterId !== context.matterId) {
    reasons.push("Review matter does not match evaluation context.");
  }

  if (!context.collectedItemIds.has(decision.collectedItemId)) {
    reasons.push("Review must reference an addressable collected item.");
  }

  if (!validTimestamp(decision.reviewedAt)) {
    limitations.push("Review time is absent or invalid.");
  }

  if (decision.sourceRefs.length === 0) {
    limitations.push("Review has no addressable supporting source reference.");
  } else if (decision.sourceRefs.some((id) => !context.sourceRecordIds.has(id))) {
    reasons.push("Review references a missing source record.");
  }

  if (duplicate(decision.sourceRefs) || duplicate(decision.issueCodes) || duplicate(decision.exceptionIds)) {
    reasons.push("Review contains duplicate source, issue, or exception references.");
  }

  if (decision.exceptionIds.some((id) => !context.exceptionIds.has(id))) {
    reasons.push("Review references an unknown exception.");
  }

  const auth = reviewAuthorization(decision, context);
  if (!auth) {
    reasons.push("An addressable REVIEW authorization is required.");
  } else {
    if (auth.action !== "REVIEW") reasons.push("Authorization action must be REVIEW.");
    if (auth.actorId !== decision.reviewedBy) reasons.push("Review authorization actor does not match reviewer.");
    if (auth.matterId !== decision.matterId) reasons.push("Review authorization matter does not match review matter.");
    if (!auth.resourceIds.includes(decision.collectedItemId)) reasons.push("Review authorization does not cover the collected item.");
    if (["NOT_AUTHORIZED", "EXPIRED", "REVOKED"].includes(auth.state)) {
      reasons.push(`Review authorization is ${auth.state}.`);
    }
    if (auth.state === "INDETERMINATE") {
      limitations.push("Review authorization is indeterminate.");
    }
    if (auth.state === "AUTHORIZED_WITH_LIMITATIONS") {
      limitations.push("Review authorization contains limitations.");
    }
  }

  const d = decision.dimensions;
  if (d.responsiveness === "ASSESSED" && decision.responsiveness === undefined) {
    reasons.push("Responsiveness is marked assessed but no responsiveness finding is recorded.");
  }
  if (d.privilege === "ASSESSED" && decision.privilege === undefined) {
    reasons.push("Privilege is marked assessed but no privilege finding is recorded.");
  }
  if (d.confidentiality === "ASSESSED" && decision.confidentiality === undefined) {
    reasons.push("Confidentiality is marked assessed but no confidentiality finding is recorded.");
  }
  if (d.privacy === "ASSESSED" && decision.privacy === undefined) {
    reasons.push("Privacy is marked assessed but no privacy finding is recorded.");
  }
  if (d.issueSignificance === "ASSESSED" && decision.issueCodes.length === 0) {
    reasons.push("Issue significance is marked assessed but no issue code is recorded.");
  }

  if (reasons.length > 0) {
    return { reviewDecisionId: decision.id, collectedItemId: decision.collectedItemId, status: "INVALID", dimensions: d, reasons, limitations };
  }

  const summary = dimensionSummary(d);
  if (summary.indeterminate > 0 || (auth && auth.state === "INDETERMINATE")) {
    return { reviewDecisionId: decision.id, collectedItemId: decision.collectedItemId, status: "INDETERMINATE", dimensions: d, reasons, limitations };
  }
  if (summary.assessed === 0) {
    return { reviewDecisionId: decision.id, collectedItemId: decision.collectedItemId, status: "NOT_REVIEWED", dimensions: d, reasons, limitations };
  }
  if (summary.assessed < summary.total || limitations.length > 0 || decision.exceptionIds.length > 0) {
    return { reviewDecisionId: decision.id, collectedItemId: decision.collectedItemId, status: "PARTIALLY_REVIEWED", dimensions: d, reasons, limitations };
  }
  return { reviewDecisionId: decision.id, collectedItemId: decision.collectedItemId, status: "REVIEWED", dimensions: d, reasons, limitations };
}
