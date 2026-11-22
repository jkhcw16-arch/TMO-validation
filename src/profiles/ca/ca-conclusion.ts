import type {
  CAApplication,
  CAAuthority,
  CAConclusion,
  CACounterargument,
  CAIssue,
  CAPrecedent,
} from "./ca-types.js";

/** TMO-CA conclusion validation and support-bounded conclusion construction. */

export type CAConclusionValidationCode =
  | "CA_CONCLUSION_REQUIRED_FIELD_MISSING"
  | "CA_CONCLUSION_ISSUE_MISSING"
  | "CA_CONCLUSION_APPLICATION_MISSING"
  | "CA_CONCLUSION_AUTHORITY_MISSING"
  | "CA_CONCLUSION_ADVERSE_AUTHORITY_MISSING"
  | "CA_CONCLUSION_NO_MERITS_STATUS_INVALID"
  | "CA_CONCLUSION_APPLICATION_NOT_READY"
  | "CA_CONCLUSION_APPLICATION_ISSUE_MISMATCH"
  | "CA_CONCLUSION_DUPLICATE_REFERENCE"
  | "CA_CONCLUSION_AUTHORITY_ROLE_COLLISION"
  | "CA_CONCLUSION_SCORE_ONLY_SHORTCUT";

export interface CAConclusionValidationIssue {
  readonly code: CAConclusionValidationCode;
  readonly conclusionId: string;
  readonly detail: string;
}

export interface CAConclusionValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CAConclusionValidationIssue[];
}

export type CAApplicationConclusionReadiness =
  | "READY"
  | "READY_WITH_COUNTERARGUMENTS"
  | "INDETERMINATE"
  | "INVALID";

export interface CAConclusionValidationContext {
  readonly issues: ReadonlyMap<string, CAIssue>;
  readonly applications: ReadonlyMap<string, CAApplication>;
  readonly applicationReadiness: ReadonlyMap<string, CAApplicationConclusionReadiness>;
  readonly authorities: ReadonlyMap<string, CAAuthority>;
  readonly precedents: ReadonlyMap<string, CAPrecedent>;
  readonly counterarguments: ReadonlyMap<string, CACounterargument>;
}

export type CAConclusionDisposition =
  | "READY_FOR_REVIEW"
  | "CONTESTED_REVIEW"
  | "NO_MERITS_DETERMINATION"
  | "INDETERMINATE"
  | "INVALID";

export interface CAConclusionAssessment {
  readonly conclusionId: string;
  readonly disposition: CAConclusionDisposition;
  readonly direction: CAConclusion["direction"];
  readonly status: CAConclusion["status"];
  readonly validation: CAConclusionValidationResult;
}

const hasText = (value: string): boolean => value.trim().length > 0;
const duplicates = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length;
const makeIssue = (
  code: CAConclusionValidationCode,
  conclusionId: string,
  detail: string,
): CAConclusionValidationIssue => ({ code, conclusionId, detail });

const hasAuthority = (
  id: string,
  context: CAConclusionValidationContext,
): boolean => context.authorities.has(id) || context.precedents.has(id);

export function validateCAConclusion(
  conclusion: CAConclusion,
  context: CAConclusionValidationContext,
): CAConclusionValidationResult {
  const issues: CAConclusionValidationIssue[] = [];

  if (
    !hasText(conclusion.id) ||
    !hasText(conclusion.issueId) ||
    !hasText(conclusion.derivationId) ||
    !hasText(conclusion.auditRef)
  ) {
    issues.push(makeIssue(
      "CA_CONCLUSION_REQUIRED_FIELD_MISSING",
      conclusion.id,
      "Conclusion requires id, issueId, derivationId, and auditRef.",
    ));
  }

  if (!context.issues.has(conclusion.issueId)) {
    issues.push(makeIssue(
      "CA_CONCLUSION_ISSUE_MISSING",
      conclusion.id,
      `Missing constitutional issue ${conclusion.issueId}.`,
    ));
  }

  if (
    conclusion.direction !== "NO_MERITS_DETERMINATION" &&
    conclusion.applicationIds.length === 0
  ) {
    issues.push(makeIssue(
      "CA_CONCLUSION_SCORE_ONLY_SHORTCUT",
      conclusion.id,
      "A constitutional merits direction requires at least one CAApplication.",
    ));
  }

  for (const id of conclusion.applicationIds) {
    const application = context.applications.get(id);
    if (!application) {
      issues.push(makeIssue(
        "CA_CONCLUSION_APPLICATION_MISSING",
        conclusion.id,
        `Missing CA application ${id}.`,
      ));
      continue;
    }
    if (application.issueId !== conclusion.issueId) {
      issues.push(makeIssue(
        "CA_CONCLUSION_APPLICATION_ISSUE_MISMATCH",
        conclusion.id,
        `Application ${id} addresses issue ${application.issueId}, not ${conclusion.issueId}.`,
      ));
    }
    const readiness = context.applicationReadiness.get(id);
    if (readiness !== "READY" && readiness !== "READY_WITH_COUNTERARGUMENTS") {
      issues.push(makeIssue(
        "CA_CONCLUSION_APPLICATION_NOT_READY",
        conclusion.id,
        `Application ${id} is ${readiness ?? "UNASSESSED"}.`,
      ));
    }
  }

  const allAuthorityIds = [
    ...conclusion.controllingAuthorityIds,
    ...conclusion.supportingAuthorityIds,
    ...conclusion.adverseAuthorityIds,
  ];
  if (
    conclusion.direction !== "NO_MERITS_DETERMINATION" &&
    allAuthorityIds.length === 0
  ) {
    issues.push(makeIssue(
      "CA_CONCLUSION_AUTHORITY_MISSING",
      conclusion.id,
      "A constitutional merits direction requires explicit legal authority.",
    ));
  }
  for (const id of allAuthorityIds) {
    if (!hasAuthority(id, context)) {
      issues.push(makeIssue(
        "CA_CONCLUSION_AUTHORITY_MISSING",
        conclusion.id,
        `Missing legal authority or precedent ${id}.`,
      ));
    }
  }

  if (
    conclusion.status === "CONTESTED" &&
    conclusion.adverseAuthorityIds.length === 0
  ) {
    issues.push(makeIssue(
      "CA_CONCLUSION_ADVERSE_AUTHORITY_MISSING",
      conclusion.id,
      "A CONTESTED conclusion requires explicit adverse authority.",
    ));
  }

  if (
    conclusion.direction === "NO_MERITS_DETERMINATION" &&
    conclusion.status === "SUPPORTED"
  ) {
    issues.push(makeIssue(
      "CA_CONCLUSION_NO_MERITS_STATUS_INVALID",
      conclusion.id,
      "NO_MERITS_DETERMINATION cannot be represented as a supported merits result.",
    ));
  }

  if (
    duplicates(conclusion.controllingAuthorityIds) ||
    duplicates(conclusion.supportingAuthorityIds) ||
    duplicates(conclusion.adverseAuthorityIds) ||
    duplicates(conclusion.applicationIds) ||
    duplicates(conclusion.limitationIds)
  ) {
    issues.push(makeIssue(
      "CA_CONCLUSION_DUPLICATE_REFERENCE",
      conclusion.id,
      "Conclusion reference arrays must not contain duplicates.",
    ));
  }

  const controlling = new Set(conclusion.controllingAuthorityIds);
  const supporting = new Set(conclusion.supportingAuthorityIds);
  const collision = conclusion.adverseAuthorityIds.some(
    (id) => controlling.has(id) || supporting.has(id),
  );
  if (collision) {
    issues.push(makeIssue(
      "CA_CONCLUSION_AUTHORITY_ROLE_COLLISION",
      conclusion.id,
      "The same authority cannot be both adverse and controlling/supporting in one conclusion without separate proposition-specific records.",
    ));
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Assesses structural disposition only. It does not decide constitutional
 * merits, select a legal conclusion, or convert readiness into adjudication.
 */
export function assessCAConclusion(
  conclusion: CAConclusion,
  context: CAConclusionValidationContext,
): CAConclusionAssessment {
  const validation = validateCAConclusion(conclusion, context);
  let disposition: CAConclusionDisposition;

  if (!validation.valid) {
    const unresolved = validation.issues.some(
      (entry) => entry.code === "CA_CONCLUSION_APPLICATION_NOT_READY",
    );
    disposition = unresolved ? "INDETERMINATE" : "INVALID";
  } else if (conclusion.direction === "NO_MERITS_DETERMINATION") {
    disposition = "NO_MERITS_DETERMINATION";
  } else if (
    conclusion.status === "CONTESTED" ||
    conclusion.adverseAuthorityIds.length > 0
  ) {
    disposition = "CONTESTED_REVIEW";
  } else {
    disposition = "READY_FOR_REVIEW";
  }

  return {
    conclusionId: conclusion.id,
    disposition,
    direction: conclusion.direction,
    status: conclusion.status,
    validation,
  };
}

export const CA_CONCLUSION_RULES = {
  CA_102:
    "Factual support cannot establish a constitutional conclusion without a legal application.",
  CA_105:
    "A no-merits disposition remains distinct from a merits conclusion.",
  CA_107:
    "Adverse authority remains explicit in contested conclusions.",
  CA_109:
    "Conclusion support is bounded by ready applications and identified legal authority.",
  CA_110:
    "No evidence score, factual validator result, or application readiness state independently determines constitutionality.",
} as const;
