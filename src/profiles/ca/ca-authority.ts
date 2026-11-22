import type {
  CAAuthority,
  CAAuthorityType,
  CABindingStatus,
  CACurrentAuthorityStatus,
} from "./ca-types.js";

/** TMO-CA authority classification and validation. */

export type CAAuthorityValidationCode =
  | "CA_AUTHORITY_REQUIRED_FIELD_MISSING"
  | "CA_AUTHORITY_TEXT_STATUS_INVALID"
  | "CA_AUTHORITY_CONTROLLING_NOT_BINDING"
  | "CA_AUTHORITY_OVERRULED_CONTROLLING_CONFLICT"
  | "CA_AUTHORITY_EVIDENCE_DUPLICATE";

export interface CAAuthorityValidationIssue {
  readonly code: CAAuthorityValidationCode;
  readonly authorityId: string;
  readonly detail: string;
}

export interface CAAuthorityValidationResult {
  readonly valid: boolean;
  readonly issues: readonly CAAuthorityValidationIssue[];
}

export interface CAAuthorityClassificationInput {
  readonly authorityType: CAAuthorityType;
  readonly bindingStatus: CABindingStatus;
  readonly currentStatus: CACurrentAuthorityStatus;
}

const hasText = (value: string): boolean => value.trim().length > 0;

/**
 * Validates structural consistency only. It does not infer whether an authority
 * is actually binding, controlling, limited, superseded, or overruled.
 */
export function validateCAAuthority(
  authority: CAAuthority,
): CAAuthorityValidationResult {
  const issues: CAAuthorityValidationIssue[] = [];

  if (
    !hasText(authority.id) ||
    !hasText(authority.citation) ||
    !hasText(authority.sourceRef) ||
    !hasText(authority.jurisdiction) ||
    !hasText(authority.derivationId) ||
    !hasText(authority.auditRef)
  ) {
    issues.push({
      code: "CA_AUTHORITY_REQUIRED_FIELD_MISSING",
      authorityId: authority.id,
      detail:
        "Authority requires id, citation, sourceRef, jurisdiction, derivationId, and auditRef.",
    });
  }

  if (
    authority.authorityType === "CONSTITUTIONAL_TEXT" &&
    authority.currentStatus === "OVERRULED"
  ) {
    issues.push({
      code: "CA_AUTHORITY_TEXT_STATUS_INVALID",
      authorityId: authority.id,
      detail:
        "Constitutional text must not use judicial precedent treatment OVERRULED.",
    });
  }

  if (
    authority.currentStatus === "CONTROLLING" &&
    authority.bindingStatus !== "BINDING"
  ) {
    issues.push({
      code: "CA_AUTHORITY_CONTROLLING_NOT_BINDING",
      authorityId: authority.id,
      detail:
        "An authority represented as CONTROLLING must also be represented as BINDING within the modeled jurisdiction and scope.",
    });
  }

  if (
    authority.currentStatus === "OVERRULED" &&
    authority.bindingStatus === "BINDING"
  ) {
    issues.push({
      code: "CA_AUTHORITY_OVERRULED_CONTROLLING_CONFLICT",
      authorityId: authority.id,
      detail:
        "An authority represented as OVERRULED must not simultaneously be represented as BINDING for the overruled proposition.",
    });
  }

  if (new Set(authority.leEvidenceIds).size !== authority.leEvidenceIds.length) {
    issues.push({
      code: "CA_AUTHORITY_EVIDENCE_DUPLICATE",
      authorityId: authority.id,
      detail: "LE evidence references must be unique.",
    });
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Returns true only when the stored classification is structurally eligible to
 * be treated as controlling. This function does not independently establish
 * the legal status of the authority.
 */
export function isStructurallyControllingCAAuthority(
  authority: CAAuthority,
): boolean {
  return (
    validateCAAuthority(authority).valid &&
    authority.bindingStatus === "BINDING" &&
    authority.currentStatus === "CONTROLLING"
  );
}

/**
 * Constitutional text, adjudicative precedent, historical practice, and
 * secondary authority remain explicitly distinguishable.
 */
export function isJudicialPrecedentAuthority(
  type: CAAuthorityType,
): boolean {
  return (
    type === "SUPREME_COURT_PRECEDENT" ||
    type === "FEDERAL_APPELLATE_PRECEDENT" ||
    type === "FEDERAL_DISTRICT_PRECEDENT" ||
    type === "STATE_PRECEDENT"
  );
}

export function compareCAAuthorityClassification(
  left: CAAuthorityClassificationInput,
  right: CAAuthorityClassificationInput,
): "SAME" | "DIFFERENT" {
  return left.authorityType === right.authorityType &&
    left.bindingStatus === right.bindingStatus &&
    left.currentStatus === right.currentStatus
    ? "SAME"
    : "DIFFERENT";
}

export const CA_AUTHORITY_RULES = {
  CA_103:
    "Authority status is not evidence weight; citation quantity or LE score cannot substitute for legal authority classification.",
  CA_104:
    "Binding and persuasive authority remain distinct and must be represented explicitly.",
  CA_106:
    "Precedential authority classification does not collapse holding, rationale, facts, or later treatment.",
  CA_107:
    "Adverse authority remains represented even when the adopted analysis reaches a contrary conclusion.",
} as const;
