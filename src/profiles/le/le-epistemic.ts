/**
 * TMO LE Epistemic Layer
 *
 * Epistemic status records what the available evidence currently supports.
 * It does not convert an assertion into fact and does not replace provenance,
 * identity/role resolution, institutional disposition, or audit history.
 */

export enum LEEpistemicStatus {
  UNASSESSED = "UNASSESSED",
  SUPPORTED = "SUPPORTED",
  PARTIALLY_SUPPORTED = "PARTIALLY_SUPPORTED",
  CONTRADICTION = "CONTRADICTION",
  INCONCLUSIVE = "INCONCLUSIVE",
  WITHDRAWN = "WITHDRAWN",
}

export type LEActiveEpistemicStatus = Exclude<
  LEEpistemicStatus,
  LEEpistemicStatus.WITHDRAWN
>;

export type LEFindingDisposition = "ACTIVE" | "WITHDRAWN";

export interface LEEpistemicEvidence {
  readonly supportingEvidenceIds: readonly string[];
  readonly contradictingEvidenceIds: readonly string[];
  readonly unresolvedEvidenceIds: readonly string[];
  readonly provenanceIds: readonly string[];
}

export interface LEEpistemicAssessment {
  readonly resourceId: string;
  readonly status: LEActiveEpistemicStatus;
  readonly disposition: LEFindingDisposition;
  readonly evidence: LEEpistemicEvidence;
  readonly derivationId: string;
  readonly auditRef: string;
}

export interface LEWithdrawal {
  readonly resourceId: string;
  readonly previousStatus: LEActiveEpistemicStatus;
  readonly reason: string;
  readonly derivationId: string;
  readonly auditRef: string;
  readonly withdrawnAt: string;
}

export enum LEEpistemicFailureCode {
  RESOURCE_ID_MISSING = "LE_EPISTEMIC_RESOURCE_ID_MISSING",
  DERIVATION_ID_MISSING = "LE_EPISTEMIC_DERIVATION_ID_MISSING",
  AUDIT_REF_MISSING = "LE_EPISTEMIC_AUDIT_REF_MISSING",
  SUPPORT_REQUIRED = "LE_EPISTEMIC_SUPPORT_REQUIRED",
  PARTIAL_SUPPORT_REQUIRED = "LE_EPISTEMIC_PARTIAL_SUPPORT_REQUIRED",
  CONTRADICTION_REQUIRES_BOTH_SIDES = "LE_EPISTEMIC_CONTRADICTION_REQUIRES_BOTH_SIDES",
  INCONCLUSIVE_BASIS_REQUIRED = "LE_EPISTEMIC_INCONCLUSIVE_BASIS_REQUIRED",
  UNASSESSED_HAS_ASSESSED_EVIDENCE = "LE_EPISTEMIC_UNASSESSED_HAS_ASSESSED_EVIDENCE",
  WITHDRAWAL_REASON_MISSING = "LE_EPISTEMIC_WITHDRAWAL_REASON_MISSING",
  WITHDRAWAL_TIME_INVALID = "LE_EPISTEMIC_WITHDRAWAL_TIME_INVALID",
}

export interface LEEpistemicValidationResult {
  readonly valid: boolean;
  readonly failure?: LEEpistemicFailureCode;
  readonly details?: string;
}

const valid = (): LEEpistemicValidationResult => ({ valid: true });

const invalid = (
  failure: LEEpistemicFailureCode,
  details: string,
): LEEpistemicValidationResult => ({ valid: false, failure, details });

const hasText = (value: string): boolean => value.trim().length > 0;

const hasAnyEvidence = (evidence: LEEpistemicEvidence): boolean =>
  evidence.supportingEvidenceIds.length > 0 ||
  evidence.contradictingEvidenceIds.length > 0 ||
  evidence.unresolvedEvidenceIds.length > 0;

/**
 * Validates status-specific epistemic conditions.
 *
 * UNASSESSED: no assessment evidence has yet been assigned.
 * SUPPORTED: at least one supporting item is required.
 * PARTIALLY_SUPPORTED: supporting evidence exists, but unresolved or
 * contradictory material prevents full support.
 * CONTRADICTION: both supporting and contradicting evidence are required.
 * INCONCLUSIVE: assessment occurred, but unresolved and/or opposed evidence
 * prevents a supported conclusion.
 */
export function validateLEEpistemicAssessment(
  assessment: LEEpistemicAssessment,
): LEEpistemicValidationResult {
  if (!hasText(assessment.resourceId)) {
    return invalid(
      LEEpistemicFailureCode.RESOURCE_ID_MISSING,
      "resourceId is required",
    );
  }

  if (!hasText(assessment.derivationId)) {
    return invalid(
      LEEpistemicFailureCode.DERIVATION_ID_MISSING,
      "derivationId is required",
    );
  }

  if (!hasText(assessment.auditRef)) {
    return invalid(
      LEEpistemicFailureCode.AUDIT_REF_MISSING,
      "auditRef is required",
    );
  }

  const evidence = assessment.evidence;

  switch (assessment.status) {
    case LEEpistemicStatus.UNASSESSED:
      if (hasAnyEvidence(evidence)) {
        return invalid(
          LEEpistemicFailureCode.UNASSESSED_HAS_ASSESSED_EVIDENCE,
          "UNASSESSED cannot contain assessed support, contradiction, or unresolved evidence",
        );
      }
      return valid();

    case LEEpistemicStatus.SUPPORTED:
      if (evidence.supportingEvidenceIds.length === 0) {
        return invalid(
          LEEpistemicFailureCode.SUPPORT_REQUIRED,
          "SUPPORTED requires at least one supporting evidence item",
        );
      }
      if (evidence.contradictingEvidenceIds.length > 0) {
        return invalid(
          LEEpistemicFailureCode.CONTRADICTION_REQUIRES_BOTH_SIDES,
          "Material contradicting evidence must be represented as CONTRADICTION or explicitly resolved by a derivation",
        );
      }
      return valid();

    case LEEpistemicStatus.PARTIALLY_SUPPORTED:
      if (evidence.supportingEvidenceIds.length === 0) {
        return invalid(
          LEEpistemicFailureCode.PARTIAL_SUPPORT_REQUIRED,
          "PARTIALLY_SUPPORTED requires supporting evidence",
        );
      }
      if (
        evidence.unresolvedEvidenceIds.length === 0 &&
        evidence.contradictingEvidenceIds.length === 0
      ) {
        return invalid(
          LEEpistemicFailureCode.PARTIAL_SUPPORT_REQUIRED,
          "PARTIALLY_SUPPORTED requires an unresolved or contradicting remainder",
        );
      }
      return valid();

    case LEEpistemicStatus.CONTRADICTION:
      if (
        evidence.supportingEvidenceIds.length === 0 ||
        evidence.contradictingEvidenceIds.length === 0
      ) {
        return invalid(
          LEEpistemicFailureCode.CONTRADICTION_REQUIRES_BOTH_SIDES,
          "CONTRADICTION requires both supporting and contradicting evidence",
        );
      }
      return valid();

    case LEEpistemicStatus.INCONCLUSIVE:
      if (!hasAnyEvidence(evidence)) {
        return invalid(
          LEEpistemicFailureCode.INCONCLUSIVE_BASIS_REQUIRED,
          "INCONCLUSIVE requires evidence showing that assessment occurred",
        );
      }
      return valid();
  }
}

/**
 * WITHDRAWN is modeled as a disposition transition so prior epistemic status
 * remains preserved rather than being erased.
 */
export function validateLEWithdrawal(
  withdrawal: LEWithdrawal,
): LEEpistemicValidationResult {
  if (!hasText(withdrawal.resourceId)) {
    return invalid(
      LEEpistemicFailureCode.RESOURCE_ID_MISSING,
      "resourceId is required",
    );
  }
  if (!hasText(withdrawal.reason)) {
    return invalid(
      LEEpistemicFailureCode.WITHDRAWAL_REASON_MISSING,
      "withdrawal reason is required",
    );
  }
  if (!hasText(withdrawal.derivationId)) {
    return invalid(
      LEEpistemicFailureCode.DERIVATION_ID_MISSING,
      "withdrawal derivationId is required",
    );
  }
  if (!hasText(withdrawal.auditRef)) {
    return invalid(
      LEEpistemicFailureCode.AUDIT_REF_MISSING,
      "withdrawal auditRef is required",
    );
  }
  if (Number.isNaN(Date.parse(withdrawal.withdrawnAt))) {
    return invalid(
      LEEpistemicFailureCode.WITHDRAWAL_TIME_INVALID,
      "withdrawnAt must be an ISO-compatible timestamp",
    );
  }
  return valid();
}

export function effectiveEpistemicStatus(
  assessment: LEEpistemicAssessment,
): LEEpistemicStatus {
  return assessment.disposition === "WITHDRAWN"
    ? LEEpistemicStatus.WITHDRAWN
    : assessment.status;
}

export function epistemicConflictHasPrecedence(
  evidence: LEEpistemicEvidence,
): boolean {
  return (
    evidence.supportingEvidenceIds.length > 0 &&
    evidence.contradictingEvidenceIds.length > 0
  );
}

export const LE_EPISTEMIC_LAYER_RULE =
  "Epistemic status describes evidentiary support, not truth; withdrawal preserves prior status and audit history." as const;
