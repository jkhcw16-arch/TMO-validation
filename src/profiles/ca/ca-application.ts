import type {
  CAApplication,
  CAAuthority,
  CACounterargument,
  CADoctrine,
  CAIssue,
  CAPrecedent,
  CAStandardOfReview,
} from "./ca-types.js";

/** TMO-CA legal-rule-to-qualified-fact application boundary. */

export type CAApplicationValidationCode =
  | "CA_APPLICATION_REQUIRED_FIELD_MISSING"
  | "CA_APPLICATION_ISSUE_MISSING"
  | "CA_APPLICATION_DOCTRINE_MISSING"
  | "CA_APPLICATION_STANDARD_MISSING"
  | "CA_APPLICATION_FACTUAL_PREDICATE_MISSING"
  | "CA_APPLICATION_LE_QUALIFICATION_MISSING"
  | "CA_APPLICATION_AUTHORITY_MISSING"
  | "CA_APPLICATION_COUNTERARGUMENT_MISSING"
  | "CA_APPLICATION_DUPLICATE_REFERENCE"
  | "CA_APPLICATION_SCORE_ONLY_SHORTCUT";

export interface CAApplicationValidationIssue {
  readonly code: CAApplicationValidationCode;
  readonly applicationId: string;
  readonly detail: string;
}

export interface CAApplicationValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CAApplicationValidationIssue[];
}

export interface CAApplicationValidationContext {
  readonly issues: ReadonlyMap<string, CAIssue>;
  readonly doctrines: ReadonlyMap<string, CADoctrine>;
  readonly standards: ReadonlyMap<string, CAStandardOfReview>;
  readonly authorities: ReadonlyMap<string, CAAuthority>;
  readonly precedents: ReadonlyMap<string, CAPrecedent>;
  readonly counterarguments: ReadonlyMap<string, CACounterargument>;
  readonly leResourceIds: ReadonlySet<string>;
}

export type CAApplicationReadiness =
  | "READY"
  | "READY_WITH_COUNTERARGUMENTS"
  | "INDETERMINATE"
  | "INVALID";

export interface CAApplicationAssessment {
  readonly applicationId: string;
  readonly readiness: CAApplicationReadiness;
  readonly issueId: string;
  readonly doctrineId: string;
  readonly standardOfReviewId: string | null;
  readonly factualPredicateIds: readonly string[];
  readonly epistemicAssessmentIds: readonly string[];
  readonly authorityIds: readonly string[];
  readonly counterargumentIds: readonly string[];
  readonly validation: CAApplicationValidationResult;
}

const hasText = (value: string): boolean => value.trim().length > 0;
const hasDuplicates = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length;
const makeIssue = (
  code: CAApplicationValidationCode,
  applicationId: string,
  detail: string,
): CAApplicationValidationIssue => ({ code, applicationId, detail });

export function validateCAApplication(
  application: CAApplication,
  context: CAApplicationValidationContext,
): CAApplicationValidationResult {
  const issues: CAApplicationValidationIssue[] = [];

  if (
    !hasText(application.id) ||
    !hasText(application.issueId) ||
    !hasText(application.doctrineId) ||
    !hasText(application.derivationId) ||
    !hasText(application.auditRef)
  ) {
    issues.push(makeIssue(
      "CA_APPLICATION_REQUIRED_FIELD_MISSING",
      application.id,
      "Application requires id, issueId, doctrineId, derivationId, and auditRef.",
    ));
  }

  if (!context.issues.has(application.issueId)) {
    issues.push(makeIssue(
      "CA_APPLICATION_ISSUE_MISSING",
      application.id,
      `Missing constitutional issue ${application.issueId}.`,
    ));
  }

  if (!context.doctrines.has(application.doctrineId)) {
    issues.push(makeIssue(
      "CA_APPLICATION_DOCTRINE_MISSING",
      application.id,
      `Missing doctrine ${application.doctrineId}.`,
    ));
  }

  if (
    application.standardOfReviewId !== null &&
    !context.standards.has(application.standardOfReviewId)
  ) {
    issues.push(makeIssue(
      "CA_APPLICATION_STANDARD_MISSING",
      application.id,
      `Missing standard of review ${application.standardOfReviewId}.`,
    ));
  }

  if (application.propositionIds.length === 0) {
    issues.push(makeIssue(
      "CA_APPLICATION_FACTUAL_PREDICATE_MISSING",
      application.id,
      "Application requires at least one explicit factual proposition.",
    ));
  }

  if (
    application.factQualificationIds.length === 0 ||
    application.epistemicAssessmentIds.length === 0
  ) {
    issues.push(makeIssue(
      "CA_APPLICATION_LE_QUALIFICATION_MISSING",
      application.id,
      "Application requires qualified LE factual predicates and epistemic assessments.",
    ));
  }

  for (const id of [
    ...application.factQualificationIds,
    ...application.epistemicAssessmentIds,
  ]) {
    if (!context.leResourceIds.has(id)) {
      issues.push(makeIssue(
        "CA_APPLICATION_LE_QUALIFICATION_MISSING",
        application.id,
        `Missing qualified LE resource ${id}.`,
      ));
    }
  }

  if (application.authorityIds.length === 0) {
    issues.push(makeIssue(
      "CA_APPLICATION_AUTHORITY_MISSING",
      application.id,
      "Application requires legal authority in addition to factual support.",
    ));
  }
  for (const id of application.authorityIds) {
    if (!context.authorities.has(id) && !context.precedents.has(id)) {
      issues.push(makeIssue(
        "CA_APPLICATION_AUTHORITY_MISSING",
        application.id,
        `Missing legal authority or precedent ${id}.`,
      ));
    }
  }

  for (const id of application.counterargumentIds) {
    if (!context.counterarguments.has(id)) {
      issues.push(makeIssue(
        "CA_APPLICATION_COUNTERARGUMENT_MISSING",
        application.id,
        `Missing counterargument ${id}.`,
      ));
    }
  }

  const arrays = [
    application.propositionIds,
    application.factQualificationIds,
    application.epistemicAssessmentIds,
    application.authorityIds,
    application.supportingArgumentIds,
    application.counterargumentIds,
  ];
  if (arrays.some(hasDuplicates)) {
    issues.push(makeIssue(
      "CA_APPLICATION_DUPLICATE_REFERENCE",
      application.id,
      "Application reference arrays must not contain duplicate identifiers.",
    ));
  }

  if (
    application.authorityIds.length === 0 &&
    application.epistemicAssessmentIds.length > 0
  ) {
    issues.push(makeIssue(
      "CA_APPLICATION_SCORE_ONLY_SHORTCUT",
      application.id,
      "Qualified evidence cannot substitute for legal authority and doctrine application.",
    ));
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Reports whether the application graph is structurally ready for legal
 * reasoning. READY is not a constitutional merits determination.
 */
export function assessCAApplicationReadiness(
  application: CAApplication,
  context: CAApplicationValidationContext,
): CAApplicationAssessment {
  const validation = validateCAApplication(application, context);

  let readiness: CAApplicationReadiness;
  if (!validation.valid) {
    const unresolvedLE = validation.issues.some(
      (entry) => entry.code === "CA_APPLICATION_LE_QUALIFICATION_MISSING",
    );
    readiness = unresolvedLE ? "INDETERMINATE" : "INVALID";
  } else if (application.counterargumentIds.length > 0) {
    readiness = "READY_WITH_COUNTERARGUMENTS";
  } else {
    readiness = "READY";
  }

  return {
    applicationId: application.id,
    readiness,
    issueId: application.issueId,
    doctrineId: application.doctrineId,
    standardOfReviewId: application.standardOfReviewId,
    factualPredicateIds: application.propositionIds,
    epistemicAssessmentIds: application.epistemicAssessmentIds,
    authorityIds: application.authorityIds,
    counterargumentIds: application.counterargumentIds,
    validation,
  };
}

export const CA_APPLICATION_RULES = {
  CA_102:
    "Qualified factual support does not establish a constitutional conclusion without legal-rule application.",
  CA_107:
    "Material counterarguments remain attached to the application rather than being erased by the adopted argument.",
  CA_108:
    "Application uses the separately represented doctrine and standard of review rather than collapsing legal requirements into one score.",
  CA_109:
    "Application strength remains bounded by its explicit legal authorities and qualified factual predicates.",
  CA_110:
    "No LE evidence score or epistemic assessment can substitute for CAApplication.",
} as const;
