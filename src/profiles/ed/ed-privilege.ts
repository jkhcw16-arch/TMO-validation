/**
 * TMO-ED Privilege evaluator.
 *
 * This module validates the structure, lineage, authorization, and review state
 * of a privilege/protection claim. It does not decide whether a legal privilege
 * actually applies; that remains a legal determination under applicable law.
 */

export type EDPrivilegeAssessmentStatus =
  | "PRIVILEGED"
  | "NOT_PRIVILEGED"
  | "POTENTIALLY_PRIVILEGED"
  | "CONTESTED"
  | "INDETERMINATE";

export type EDPrivilegeValidationStatus =
  | "VALID"
  | "VALID_WITH_LIMITATIONS"
  | "INDETERMINATE"
  | "INVALID";

export type EDPrivilegeBasisType =
  | "ATTORNEY_CLIENT"
  | "WORK_PRODUCT"
  | "COMMON_INTEREST"
  | "JOINT_DEFENSE"
  | "STATUTORY_OR_REGULATORY"
  | "COURT_ORDER"
  | "OTHER";

export type EDPrivilegeDisclosureState =
  | "NOT_DISCLOSED"
  | "INTENTIONALLY_DISCLOSED"
  | "INADVERTENTLY_DISCLOSED"
  | "DISCLOSURE_UNKNOWN";

export interface EDPrivilegeBasis {
  readonly type: EDPrivilegeBasisType;
  readonly authorityRef: string;
  readonly description: string;
}

export interface EDPrivilegeAssessmentRecord {
  readonly id: string;
  readonly matterId: string;
  readonly collectedItemId: string;
  readonly assessedBy: string;
  readonly assessedAt?: string;
  readonly authorizationId?: string;
  readonly status: EDPrivilegeAssessmentStatus;
  readonly bases: readonly EDPrivilegeBasis[];
  readonly sourceRefs: readonly string[];
  readonly disclosureState: EDPrivilegeDisclosureState;
  readonly disclosureEventRefs: readonly string[];
  readonly rectificationRefs: readonly string[];
  readonly courtOrderRefs: readonly string[];
  readonly agreementRefs: readonly string[];
  readonly exceptionIds: readonly string[];
  readonly claimDescription?: string;
}

export interface EDPrivilegeAuthorizationRecord {
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

export interface EDPrivilegeContext {
  readonly matterId: string;
  readonly collectedItemIds: ReadonlySet<string>;
  readonly sourceRecordIds: ReadonlySet<string>;
  readonly disclosureEventIds: ReadonlySet<string>;
  readonly rectificationIds: ReadonlySet<string>;
  readonly courtOrderIds: ReadonlySet<string>;
  readonly agreementIds: ReadonlySet<string>;
  readonly exceptionIds: ReadonlySet<string>;
  readonly authorizations: readonly EDPrivilegeAuthorizationRecord[];
}

export interface EDPrivilegeEvaluation {
  readonly assessmentId: string;
  readonly collectedItemId: string;
  readonly status: EDPrivilegeValidationStatus;
  readonly privilegeStatus: EDPrivilegeAssessmentStatus;
  readonly reasons: readonly string[];
  readonly limitations: readonly string[];
}

export const ED_PRIVILEGE_INVARIANTS = {
  "ED-PRIV-101": "Privilege assessment remains separately addressable from responsiveness and other review dimensions.",
  "ED-PRIV-102": "A privilege or protection claim requires an explicit basis and addressable support when represented as privileged.",
  "ED-PRIV-103": "Privilege review authorization is actor-, matter-, action-, and item-specific.",
  "ED-PRIV-104": "Disclosure history is preserved and does not itself determine waiver.",
  "ED-PRIV-105": "Inadvertent disclosure, rectification, agreements, and court orders remain separately represented.",
  "ED-PRIV-106": "Unknown, contested, and potentially privileged states remain explicit and cannot be promoted to PRIVILEGED.",
  "ED-PRIV-107": "Privilege status does not establish truth, responsiveness, admissibility, or legal merits."
} as const;

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function validTime(value: string | undefined): boolean {
  return value !== undefined && Number.isFinite(Date.parse(value));
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function referencesExist(values: readonly string[], known: ReadonlySet<string>): boolean {
  return values.every((value) => known.has(value));
}

function findAuthorization(
  assessment: EDPrivilegeAssessmentRecord,
  context: EDPrivilegeContext
): EDPrivilegeAuthorizationRecord | undefined {
  if (!assessment.authorizationId) return undefined;
  return context.authorizations.find((record) => record.id === assessment.authorizationId);
}

export function evaluateEDPrivilege(
  assessment: EDPrivilegeAssessmentRecord,
  context: EDPrivilegeContext
): EDPrivilegeEvaluation {
  const reasons: string[] = [];
  const limitations: string[] = [];

  if (!hasText(assessment.id) || !hasText(assessment.assessedBy)) {
    reasons.push("Assessment ID and assessor are required.");
  }
  if (assessment.matterId !== context.matterId) {
    reasons.push("Privilege assessment matter does not match evaluation context.");
  }
  if (!context.collectedItemIds.has(assessment.collectedItemId)) {
    reasons.push("Privilege assessment must reference an addressable collected item.");
  }
  if (!validTime(assessment.assessedAt)) {
    limitations.push("Privilege assessment time is missing or invalid.");
  }

  const arrays = [
    assessment.sourceRefs,
    assessment.disclosureEventRefs,
    assessment.rectificationRefs,
    assessment.courtOrderRefs,
    assessment.agreementRefs,
    assessment.exceptionIds
  ];
  if (arrays.some(hasDuplicates)) {
    reasons.push("Privilege assessment contains duplicate references.");
  }

  if (!referencesExist(assessment.sourceRefs, context.sourceRecordIds)) {
    reasons.push("Privilege assessment references an unknown source record.");
  }
  if (!referencesExist(assessment.disclosureEventRefs, context.disclosureEventIds)) {
    reasons.push("Privilege assessment references an unknown disclosure event.");
  }
  if (!referencesExist(assessment.rectificationRefs, context.rectificationIds)) {
    reasons.push("Privilege assessment references an unknown rectification event.");
  }
  if (!referencesExist(assessment.courtOrderRefs, context.courtOrderIds)) {
    reasons.push("Privilege assessment references an unknown court-order record.");
  }
  if (!referencesExist(assessment.agreementRefs, context.agreementIds)) {
    reasons.push("Privilege assessment references an unknown agreement record.");
  }
  if (!referencesExist(assessment.exceptionIds, context.exceptionIds)) {
    reasons.push("Privilege assessment references an unknown exception.");
  }

  const authorization = findAuthorization(assessment, context);
  if (!authorization) {
    reasons.push("An addressable REVIEW authorization is required for privilege assessment.");
  } else {
    if (authorization.action !== "REVIEW") reasons.push("Privilege assessment authorization action must be REVIEW.");
    if (authorization.actorId !== assessment.assessedBy) reasons.push("Privilege authorization actor does not match assessor.");
    if (authorization.matterId !== assessment.matterId) reasons.push("Privilege authorization matter does not match assessment matter.");
    if (!authorization.resourceIds.includes(assessment.collectedItemId)) reasons.push("Privilege authorization does not cover the collected item.");
    if (["NOT_AUTHORIZED", "EXPIRED", "REVOKED"].includes(authorization.state)) {
      reasons.push(`Privilege authorization is ${authorization.state}.`);
    }
    if (authorization.state === "INDETERMINATE") {
      limitations.push("Privilege review authorization is indeterminate.");
    }
    if (authorization.state === "AUTHORIZED_WITH_LIMITATIONS") {
      limitations.push("Privilege review authorization contains limitations.");
    }
  }

  if (assessment.status === "PRIVILEGED") {
    if (assessment.bases.length === 0) reasons.push("PRIVILEGED requires at least one explicit privilege/protection basis.");
    if (!hasText(assessment.claimDescription)) reasons.push("PRIVILEGED requires a nonempty claim description.");
    if (assessment.sourceRefs.length === 0) limitations.push("PRIVILEGED has no addressable supporting source reference.");
  }

  for (const basis of assessment.bases) {
    if (!hasText(basis.authorityRef) || !hasText(basis.description)) {
      reasons.push("Each privilege basis requires an authority reference and description.");
    }
  }

  if (assessment.disclosureState === "NOT_DISCLOSED" && assessment.disclosureEventRefs.length > 0) {
    reasons.push("NOT_DISCLOSED conflicts with recorded disclosure events.");
  }
  if (
    ["INTENTIONALLY_DISCLOSED", "INADVERTENTLY_DISCLOSED"].includes(assessment.disclosureState) &&
    assessment.disclosureEventRefs.length === 0
  ) {
    reasons.push("A disclosed item requires an addressable disclosure event.");
  }
  if (assessment.disclosureState === "DISCLOSURE_UNKNOWN") {
    limitations.push("Disclosure state remains unknown.");
  }
  if (
    assessment.disclosureState === "INADVERTENTLY_DISCLOSED" &&
    assessment.rectificationRefs.length === 0 &&
    assessment.courtOrderRefs.length === 0 &&
    assessment.agreementRefs.length === 0
  ) {
    limitations.push("Inadvertent disclosure is recorded without rectification, court-order, or agreement lineage.");
  }

  if (reasons.length > 0) {
    return {
      assessmentId: assessment.id,
      collectedItemId: assessment.collectedItemId,
      status: "INVALID",
      privilegeStatus: assessment.status,
      reasons,
      limitations
    };
  }

  if (
    assessment.status === "INDETERMINATE" ||
    assessment.disclosureState === "DISCLOSURE_UNKNOWN" ||
    authorization?.state === "INDETERMINATE"
  ) {
    return {
      assessmentId: assessment.id,
      collectedItemId: assessment.collectedItemId,
      status: "INDETERMINATE",
      privilegeStatus: assessment.status,
      reasons,
      limitations
    };
  }

  if (
    assessment.status === "POTENTIALLY_PRIVILEGED" ||
    assessment.status === "CONTESTED" ||
    limitations.length > 0 ||
    assessment.exceptionIds.length > 0
  ) {
    return {
      assessmentId: assessment.id,
      collectedItemId: assessment.collectedItemId,
      status: "VALID_WITH_LIMITATIONS",
      privilegeStatus: assessment.status,
      reasons,
      limitations
    };
  }

  return {
    assessmentId: assessment.id,
    collectedItemId: assessment.collectedItemId,
    status: "VALID",
    privilegeStatus: assessment.status,
    reasons,
    limitations
  };
}
